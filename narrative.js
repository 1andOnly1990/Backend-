// Vercel Serverless Function: api/narrative.js
// Handles GET requests to /api/narrative to fetch the current game state.

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

// --- INITIAL GAME DATA ---
// This data is used to start the game if no state is found in the database.
const initialGameState = `
#
#--- CANONICAL GAME STATE (TIER 3) ---
# This state is aligned with the Project Chimera simulation engine and the established World Context.
#

# World simulation clock and time progression
game_info:
  world_clock: {day: 1, hour: 8, minute: 30} # In-game time
  time_delta: {minutes: 0} # Time passed in the last turn
  current_objective: "Infiltrate the OmniCorp depot using the 'Trojan Horse' strategy."

# Dynamic global event tracking
world_events:
  black_sun_retaliation_level: "low" # low | medium | high
  public_awareness_of_incident: "zero" # zero | local | widespread
  city_security_alert_level: "green" # green | yellow | red
  emergent_log:
    - "Day 1, 08:15 - Black Sun convoy carrying 'The Package' departed East Freight Terminal for OmniCorp depot."

# Player character model
player:
  name: "Cipher"
  location: "Abandoned Warehouse, Veridia City East Freight Terminal"
  status_effects: ["Adrenaline (3 turns)"]
  inventory:
    - item: "Standard Issue Sidearm"
      properties: ["ammo_type: standard"]
    - item: "Encrypted Datapad"
      properties: ["firewalled"]
    - item: "Surveillance Drone"
      properties: ["micro-drone", "limited_battery"]
    - item: "Portable EMP Device"
      properties: ["single_use", "area_of_effect: 5m"]
    - item: "Zip-tie Restraints"
      properties: ["quantity: 5"]
  active_projects:
    - project: "None"
      progress: 0.0
      time_required: 0
  skills:
    hacking_proficiency: "intermediate"
    combat_rating: "expert"
    stealth_expertise: "expert"

# Faction Simulation System
factions:
  black_sun_solutions:
    disposition_to_player: -80 # from -100 (Hated) to 100 (Allied)
    resources: "high"
    current_goals: ["Securely deliver 'The Package' to OmniCorp", "Identify and neutralize source of interference (Cipher)"]
    active_operations: ["Convoy escort duty", "Sweeping network for traces of Silas Vane's data transmissions"]
  omnicorp:
    disposition_to_player: -10 # Unaware but cautious
    resources: "vast"
    current_goals: ["Receive and secure 'The Package' from Black Sun", "Contain information breach regarding the asset"]
    active_operations: ["Preparing depot for high-value asset arrival", "Internal security audit"]
  veridia_city_pd:
    disposition_to_player: 0 # Unaware
    resources: "medium"
    current_goals: ["Maintain public order"]
    active_operations: ["Standard patrols in the freight district"]

# Expanded NPC Model
npcs:
  - name: "Silas Vane"
    location: "Veridia City Hospital ICU"
    status: "Stable (John Doe)"
    disposition: "Indebted; wary but trusting"
    faction_affiliation: "independent_courier_network"
    needs: ["safety", "anonymity"]
    current_plan: ["Remain immobile and feign amnesia if questioned"]
    knowledge:
      - "Black Sun Solutions is involved."
      - "The Package is a quantum-resistant decryption algorithm."
      - "He betrayed Black Sun and was targeted for execution."
  - name: "Black Sun Commander Xael"
    location: "Mobile Command Center, Veridia City"
    status: "Active"
    disposition_to_player: -75 # Relentless, analytical
    faction_affiliation: "black_sun_solutions"
    needs: ["mission_success", "maintain_reputation"]
    current_plan: ["Oversee the delivery of 'The Package' remotely", "Authorize network analysts to hunt for intrusion signatures"]

mission_log:
  - "Rescued courier Silas Vane from Black Sun execution."
  - "Neutralized a Black Sun assassin at the hospital using non-lethal psychic surgery."
  - "Identified 'The Package' as a quantum-resistant decryption algorithm."
  - "Tracked Black Sun convoy retrieving 'The Package'."
  - "Achieved tactical omniscience over the convoy's movements."
  - "Chose the 'Trojan Horse' path, aiming to infiltrate the OmniCorp depot."

current_location_details:
  name: "Abandoned Warehouse, Veridia City East Freight Terminal"
  description: "A derelict six-story warehouse overlooking the sprawling freight terminal. Filled with dust, decay, and silence. Cipher is positioned in a third-floor office."
  security_status: "unsecured"
  known_factions_present: []
  environmental_factors:
    - "Morning light burning off rain clouds"
    - "Distant hum of terminal activity"
`;

const initialNarrative = `
The world was a grid of rust and grey concrete, viewed through a film of grime on a third-story window. Below, the Veridia City East Freight Terminal hummed with the quiet, remorseless industry of a thousand robotic handlers and a handful of human overseers. Rain from the night before steamed off the asphalt under a weak morning sun. Cipher stood back from the window, a silhouette in the dusty gloom of the derelict office. The adrenaline from the hospital confrontation had faded, leaving a cold, sharp clarity.

Across the sprawling yard of stacked containers and skeletal cranes stood his target: the OmniCorp Depot. It was a fortress of clean, brutalist architecture, an island of ruthless efficiency in the terminal's grimy chaos. According to the emergent log, the Black Sun convoy had arrived fifteen minutes ago. Inside that depot, behind layers of steel and security, sat 'The Package'—a quantum-resistant decryption algorithm that could break the spine of the modern world.

*The 'Trojan Horse' strategy is viable,* Aura's thoughts integrated seamlessly with his own, a stream of pure data against the backdrop of his intuition. *Multiple cargo vehicles will be entering and leaving the depot. However, their security protocols are unknown. Blind infiltration carries a 78.4% probability of failure.*

He needed more information. The first move in a war of shadows is always to see, to know. To turn the enemy's fortress into a map of his own making. He considered the tools at his disposal, the tactical possibilities branching before him in the quiet air.

A set of options materialized in his internal vision, projected by Aura.

**[ACTION 1]:** Deploy the micro-drone for an aerial reconnaissance sweep of the OmniCorp depot.
<AURA_BRIEFING>
* **Objective:** Gather real-time visual intelligence on depot entry points, guard patrols, and the status of the Black Sun convoy.
* **Probability of Success:** High. The drone is small and the morning terminal activity provides excellent sensory cover.
* **Potential Consequences:**
    * **Positive:** Obtain actionable intel on layout and security patterns. Identify potential vulnerabilities or routines to exploit.
    * **Negative:** OmniCorp and Black Sun are high-security entities; active counter-surveillance is possible. Detection could compromise your location and escalate the \`city_security_alert_level\`. The drone's battery is limited, restricting flight time.
</AURA_BRIEFING>

**[ACTION 2]:** Use the Encrypted Datapad to probe the OmniCorp depot's local network for vulnerabilities.
<AURA_BRIEFING>
* **Objective:** Access security camera feeds, personnel rosters, and internal shipping manifests to digitally map the depot and pinpoint the algorithm's location.
* **Probability of Success:** Moderate. OmniCorp's network will be hardened. Your \`hacking_proficiency\` is \`intermediate\`, and their ongoing internal security audit presents both risks and potential overlooked openings.
* **Potential Consequences:**
    * **Positive:** Gain a comprehensive digital blueprint of the target location. Potentially locate the target asset without visual confirmation. Create digital backdoors for later use.
    * **Negative:** A failed hack would likely trigger a silent alarm, notifying OmniCorp security of an active intrusion attempt and increasing their digital defenses. This could also raise \`omnicorp.disposition_to_player\`.
</AURA_BRIEFING>

**[ACTION 3]:** Remain concealed and use this vantage point to begin formulating the specifics of the 'Trojan Horse' infiltration.
<AURA_BRIEFING>
* **Objective:** Use telescopic observation and tactical analysis to determine the most viable type of vehicle or container to use as a delivery vector.
* **Probability of Success:** High (for planning). Low (for immediate execution without more intelligence).
* **Potential Consequences:**
    * **Positive:** Develop a coherent, step-by-step infiltration plan, identifying necessary equipment and timing based on observable traffic patterns.
    * **Negative:** The resulting plan will be based on external observation only. Without drone or network intelligence, you risk basing the entire operation on assumptions that could lead to unforeseen traps or security measures.
</AURA_BRIEFING>

What do you do?
`;

// --- API HANDLER ---
async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Try to get the last narrative from KV store
        let lastNarrative = await kv.get('project_chimera_last_narrative');

        // If no narrative is found, it's the first run.
        if (!lastNarrative) {
            // Set the initial state and narrative
            await kv.set(GAME_STATE_KEY, initialGameState);
            await kv.set('project_chimera_last_narrative', initialNarrative);
            lastNarrative = initialNarrative;
        }

        res.status(200).json({ narrative: lastNarrative });

    } catch (error) {
        console.error("Error fetching narrative:", error);
        res.status(500).json({ error: 'Failed to retrieve game state from the database.' });
    }
}

export default allowCors(handler);
