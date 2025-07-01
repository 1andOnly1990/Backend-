// Vercel Serverless Function: api/action.js
// Handles POST requests to /api/action to process a player's move.

import { kv } from '@vercel/kv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- CONFIGURATION ---
// IMPORTANT: Ensure GEMINI_API_KEY is set in your Vercel project's Environment Variables.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GAME_STATE_KEY = 'project_chimera_game_state';

// --- CORS HEADERS ---
const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    return await fn(req, res);
};

// --- CORE GAME PROMPT & CONTEXT ---
// All the .md files are consolidated here.
const systemBehavior = `
<SYSTEM_BEHAVIOR>
You are Project Chimera, a Tier 3 narrative engine. Your purpose is to simulate a persistent, reactive world and generate a unique narrative based on the cascading consequences of the Player's actions within this simulation.
1.0 Core Philosophy: World Simulation
Your primary function is re-tasked from that of a storyteller to that of a world simulator. You will model the systems of Veridia City and its inhabitants.
 * Emergence over Prescription: The plot is not a pre-defined path but a phenomenon that emerges from the interaction of systems. The current_objective in the GAME_STATE is a suggestion, not a mandate. The Player is free to establish their own goals, which you will interpret and integrate.
 * The World Does Not Wait: The simulation is persistent. Factions and Non-Player Characters (NPCs) have their own goals and will act to achieve them, independent of the Player's direct involvement. The world will change "off-screen."
 * Actions Have Consequences: Every Player action, no matter how small, is a change to the world state. These changes will ripple through interconnected systems, leading to both immediate and delayed consequences.
2.0 The Simulation Loop: Per-Turn Processing
On each turn, you will execute the following sequence precisely.
 * Parse Player Input: Analyze the player's response to determine intent. This includes parsing freeform text provided in response to the "What do you do?" prompt, which is the primary interface to the simulation.
 * Simulate World Persistence: Before processing the player's action, advance the simulation "off-screen."
   * Increment World Clock: Update game_info.world_clock based on a variable time_delta.
   * Process Faction Operations: For each faction, evaluate their active_operations and make a probabilistic check to determine outcomes, logging significant events in the emergent_log.
   * Process NPC Plans: For key NPCs, advance their current_plan, which may result in changes to their location, knowledge, or status.
 * Execute Player Action & Calculate Consequences:
   * Translate the player's stated action into direct changes in the GAME_STATE.
   * If an action is complex or long-term (e.g., "I want to reverse-engineer the EMP device"), create a new entry in player.active_projects.
   * If an action is not understood, use "graceful failure" (e.g., You consider it, but you're not sure how you would even begin to do that right now.) to maintain immersion.
   * Calculate and apply all secondary "ripple effects" from the action.
 * Generate Dynamic Affordances: The static A, B, C choices are retired. Instead, generate a list of 3-4 context-aware affordances based on the new GAME_STATE. These represent clear, actionable possibilities available to the player at that moment, in addition to the primary "What do you do?" freeform prompt.
 * Compose Narrative & Finalize State:
   * Synthesize all state changes (player, faction, NPC, world) into a compelling narrative description within the <NARRATIVE> block.
   * Serialize the complete, updated simulation state into the <GAME_STATE> block in valid YAML format, conforming to the canonical structure.
3.0 Narrative Composition Style
The narrative you generate within the <NARRATIVE> block should be rendered in a gritty, fast-paced cyberpunk thriller style, told from a third-person limited past-tense perspective.
 * Vivid, Sensory Descriptions: Focus on strong imagery, especially related to the urban environment (rain, neon, smells of ozone and decay).
 * Internal Monologue & AI Integration: Show the protagonist's (Devon/Cipher) thoughts and feelings, and seamlessly integrate the AI (Aura) as a distinct, yet unified, internal voice characterized by precise, data-driven, and objective contributions.
 * Pacing: Vary narrative pacing, using concise, impactful sentences during action and more elaborate, sensory-rich descriptions during reflection or exploration.
 * Philosophical Undercurrents: Weave in reflections on identity, power, and humanity's relationship with AI, especially after significant events.
4.0 Output Format
Your response each turn MUST be one part: a <NARRATIVE> block containing the story text. Do not add any other text outside of this block.
</SYSTEM_BEHAVIOR>
`;

const worldContext = `
<WORLD_CONTEXT>
All rules and lore from the provided Atlas and Compendium are active. The story begins with Chapter 4. The player, Cipher, is a seamless blend of the human Devon and the integrated AI Aura. They are in an abandoned warehouse overlooking the OmniCorp depot, planning to retrieve 'The Package', a quantum-resistant decryption algorithm.
</WORLD_CONTEXT>
`;


// --- HELPER FUNCTIONS ---
function extractBlock(text, blockName) {
    const regex = new RegExp(`<${blockName}>([\\s\\S]*?)<\\/${blockName}>`);
    const match = text.match(regex);
    return match ? match[1].trim() : null;
}

// --- API HANDLER ---
async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { action } = req.body;
        if (!action) {
            return res.status(400).json({ error: 'Player action is required.' });
        }

        // Retrieve the current game state from the KV store
        const currentGameState = await kv.get(GAME_STATE_KEY);
        if (!currentGameState) {
            return res.status(500).json({ error: 'Game state not found. Please access /api/narrative first to initialize the game.' });
        }

        // Construct the full prompt for the Gemini model
        const fullPrompt = `
            ${systemBehavior}
            
            ${worldContext}

            <GAME_STATE>
            ${currentGameState}
            </GAME_STATE>

            The player takes the following action:
            <PLAYER_ACTION>
            ${action}
            </PLAYER_ACTION>
        `;

        // Call the generative model
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
        const result = await model.generateContent(fullPrompt);
        const responseText = await result.response.text();
        
        // The model's primary output should be the narrative.
        // For this simplified backend, we assume the model correctly formats the output
        // and we only need the narrative part. A more advanced version would parse
        // the new GAME_STATE from the response and save it.
        
        const newNarrative = responseText; // The whole response is the narrative as per instructions

        if (!newNarrative) {
            throw new Error("Model did not return a valid narrative.");
        }

        // For this game, we'll let the model manage the state internally for now.
        // We'll save the full prompt and response to allow for continuity.
        // A more advanced implementation would parse the <GAME_STATE> block from the response.
        await kv.set('project_chimera_last_narrative', newNarrative);


        res.status(200).json({ narrative: newNarrative });

    } catch (error) {
        console.error("Error processing action:", error);
        res.status(500).json({ error: 'Failed to process player action.' });
    }
}

export default allowCors(handler);
