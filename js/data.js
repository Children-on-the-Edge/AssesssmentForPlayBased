/* data.js — default/seed content ported from the original Python app.
 * This is only used the FIRST time the app runs on a device (to populate
 * localStorage). After that, everything is editable via Settings and
 * persisted locally.
 */

const DEFAULT_TOOL1_SECTIONS = {
  "Core Developmental Goals": {
    comment_key: "Additional Comments (Core Developmental Goal)",
    goals: [
      "SE: I can play cooperatively with others e.g. sharing and taking turns",
      "SE: I can keep on trying even when I encounter difficulties in my play",
      "SE: I can show pleasure in my achievements",
      "SE: I can concentrate on a task without getting distracted",
      "LL: I can follow simple instructions",
      "LL: I can speak in full sentences in my first language",
      "SE: I can seek help from others when I need it",
      "CI: I can demonstrate problem solving skills by finding solutions during play e.g finding a new way to build a creation"
    ]
  },
  "Activity 1 \u2013 Movement & Name": {
    comment_key: "Additional Comments (Activity 1)",
    goals: [
      "GM: I can cross my midline without losing balance",
      "GM: I can catch an object with both hands",
      "GM: I can throw an object accurately to another person",
      "LL: I can say my name and age (in years) correctly",
      "LL: I can recognise and select my own name",
      "LL: I can sing along with a familiar song",
      "SE: I can come into the learning space and join an activity confidently on my own"
    ]
  },
  "Activity 2 \u2013 Numeracy & Patterns": {
    comment_key: "Additional Comments (Activity Two)",
    goals: [
      "CD: I can name basic 2D shapes e.g. circle, triangle, square (in home language)",
      "CD: I can recognise and name numerals under 5",
      "CD: I can recognise and name numerals between 6 and 10",
      "CD: I can sort objects into groups (i.e size, colour, shape)",
      "CD: I can accurately count 10 objects",
      "CD: I can continue to make a simple repeated pattern with objects",
      "CD: I can organise 5 objects in order of size",
      "CD: I can use objects to perform simple addition and subtraction"
    ]
  },
  "Activity 3 \u2013 Creative Play": {
    comment_key: "Additional Comments (Activity Three)",
    goals: [
      "SE: I can engage in play independently",
      "CI: I can develop my own ideas",
      "CI: I can use given resources to make my own creation",
      "SE: I can confidently tell you about something I have made"
    ]
  },
  "Activity 4 \u2013 Story & Language": {
    comment_key: "Additional Comments (Activity Four)",
    goals: [
      "LL: I can name familiar objects on picture cards",
      "LL: I can retell a story in my first language using picture cards prompts",
      "SE: I can listen with interest to a story without losing focus",
      "CI: I can use my imagination to change an element of a story",
      "LL: I can sequence a simple story using picture cards",
      "SE: I can verbally participate with confidence as part of a familiar group",
      "SE: I can show an understanding of the farmers' feelings and experiences"
    ]
  },
  "Activity 5 \u2013 Drawing & Writing": {
    comment_key: "Additional Comments (Activity Five)",
    goals: [
      "FM: I can draw a person with body parts in the correct place",
      "FM: I can include details in my such as facial features and clothing such as facial features and clothing",
      "CD: I can name five body parts correctly",
      "LL: I can recall and write most letters recognisably to spell my name",
      "FM: I can write using the tripod pencil grip",
      "SE: I can explain how the person I have drawn is feeling (i.e sad face / happy face)"
    ]
  },
  "Activity 6 \u2013 Gross Motor Skills": {
    comment_key: "Additional Comments (Activity Six)",
    goals: [
      "GM: I can balance on one leg for 5 seconds",
      "GM: I can jump with two feet together",
      "GM: I can move in different ways with control and coordination",
      "GM: I can hop on one leg",
      "GM: I can skip",
      "GM: I can walk in a straight line (heel to toe)",
      "GM: I can move my body over and under a skipping rope"
    ]
  },
  "Activity 7 \u2013 Fine Motor & Imagination": {
    comment_key: "Additional Comments (Activity Seven)",
    goals: [
      "FM: I can pick up small objects between my thumb and forefinger (pincer grip)",
      "FM: I can mould simple forms from clay / playdough",
      "CI: I can engage in role play / imaginative play",
      "CI: I can use clay / play dough to make something (that I have not been directed to make)"
    ]
  }
};

const DEFAULT_TOOL2_SECTIONS = {
  "Child Protection": {
    comment_key: "Additional Comments (1.1 Child Protection)",
    goals: [
      "1.1 There is a Safeguarding Policy with procedures",
      "1.1 Educator can describe what to do if there is a child protection incident, concern or reason for referral",
      "1.1 The written curriculum includes teaching children what to do if they are being abused",
      "1.1 The environment is free from verbal and emotional abuse e.g. name calling, harsh criticism",
      "1.1 Children are safe from physical violence at the setting"
    ]
  },
  "Health Safety": {
    comment_key: "Additional Comments (1.2 Health & Safety)",
    goals: [
      "1.2 An environment risk assessment is in place and is regularly reviewed",
      "1.2 There is a well maintained and in date first aid kit on site",
      "1.2 The environment is sufficiently free from physical and chemical hazards allowing children to circulate safely",
      "1.2 Shelter from the weather is provided as necessary",
      "1.2 There are facilities to wash hands and all children are observed using them at appropriate times",
      "1.2 The latrines / toilets are safe for children and staff to use",
      "1.2 The recommended ratio of adults to children is met as per organisational requirements"
    ]
  },
  "Equipment & Resources": {
    comment_key: "Additional Comments (2.1 Equipment and Resources)",
    goals: [
      "2.1 Learning materials are clean and stored appropriately",
      "2.1 Equipment and resources are age or stage appropriate",
      "2.1 Resources allow for open-ended play and exploration",
      "2.1 Learning materials are freely available for children to self-select",
      "2.1 There is a comfortable sitting area (e.g mats to sit on)"
    ]
  },
  "Planning for and Implementing Purposeful Play": {
    comment_key: "Additional Comments (2.2 Purposeful Play)",
    goals: [
      "2.2 Activities are linked to the curriculum and are developmentally appropriate",
      "2.2 Playful teaching and learning is planned for",
      "2.2 Children have opportunities to play and explore through first hand experiences",
      "2.2 Children choose how they play with materials in at least one part of the session"
    ]
  },
  "Interactions & Relationships": {
    comment_key: "Additional Comments (2.3 Interactions and Relationships)",
    goals: [
      "2.3 Most children settle easily on arrival",
      "2.3 Educators positively interact with all children without prejudice",
      "2.3 Educators listen actively and respond appropriately to all children",
      "2.3 Educators respond to children\u2019s physical and emotional needs",
      "2.3 Educators give opportunities for children to share their own personal experiences, ideas or stories",
      "2.3 Educators engage with children when they are playing and make efforts to extend learning",
      "2.3 Educators are sensitive and careful not to persistently control the play",
      "2.3 Educators encourage children to speak and think critically by asking open questions, offering suggestions and sharing their own experiences",
      "2.3 Children show confidence when approaching and asking adults for help and/or to share experiences",
      "2.3 Children play cooperatively with other children",
      "2.3 Children interact and talk to each other during play activities"
    ]
  },
  "Inclusive Play": {
    comment_key: "Additional Comments (2.4 Inclusive Play)",
    goals: [
      "2.4 Children with disabilities are in attendance",
      "2.4 Boys and girls are able to engage in similar experiences regardless of gender",
      "2.4 The environment and teaching is appropriately adapted for children with additional needs to enable access to and engagement in playful learning",
      "2.4 Planning takes into account the differing needs of children",
      "2.4 Educators know how to promote equality and diversity through everyday practice with children e.g. challenging discrimination and stereotypical behaviours"
    ]
  },
  "Attitudes Behaviours Dispositions": {
    comment_key: "Additional Comments (2.5 Attitudes, Behaviours & Dispositions)",
    goals: [
      "2.5 Children show respect for educators and peers",
      "2.5 Educators use co-regulation strategies to help children manage their feelings",
      "2.5 Educators support children to resolve conflicts that may occur during play",
      "2.5 Educators promote age appropriate social behaviours e.g. sharing, valuing others",
      "2.5 Children are curious, able to concentrate and are enjoying the session"
    ]
  },
  "Continuous Child Assessment": {
    comment_key: "Additional Comments (2.6 Continuous Child Assessment)",
    goals: [
      "2.6 Facilitator can explain what Child 1 is interested in / enjoys / is able to do well",
      "2.6 Facilitator can explain what Child 1 needs further support with",
      "2.6 Facilitator can describe how they will extend Child 1's learning / next steps",
      "2.6 Facilitator can explain what Child 2 is interested in / enjoys / is able to do well",
      "2.6 Facilitator can explain what Child 2 needs further support with",
      "2.6 Facilitator can describe how they will extend Child 2's learning / next steps",
      "2.6 Strategies identified to extend learning are play-based"
    ]
  },
  "Family Engagement": {
    comment_key: "Additional Comments (2.7 Family Engagement)",
    goals: [
      "2.7 Educators engage positively with families as they arrive / leave",
      "2.7 Educators engage with families regularly regarding routines and expectations",
      "2.7 Parents are informed of their child\u2019s progress",
      "2.7 Educators understand and can explain the importance of sharing the value of play with parents and carers",
      "2.7 Programme equips parents or caregivers with strategies to extend children\u2019s learning at home through play"
    ]
  }
};

const DEFAULT_VALUES = {
  Setting: ["Kimbiliyo", "Salaama", "Unity", "Union 1", "Union 2", "Little Stars 1", "Little Stars 2", "Mountain"],
  Zone: ["Buliti", "Bukere", "Itambabiniga", "Kaboni", "Bujubli"],
  Facilitator: ["Masika Silwamughuma Bernadette", "Rehema Nishimwe", "Mugenyi Cecille", "Asifiwe Aranda", "Sehinda Console", "Ainebyona Apophia", "Akankunda Claire", "Musemeza Patrick"],
  Assessor: ["Lucien Niyogusa Bisonga", "Christian Africa Niyosaba", "Richard Mutabazi", "Habert Eliya", "Kato Godwin", "Methodius Frank Ukwishaka", "Alikiba Mustafa"]
};

const SECTION_LABELS = {
  SE: "Social and Emotional Development Skills",
  FM: "Fine Motor Skills",
  GM: "Gross Motor Skills",
  LL: "Language and Literacy Skills",
  CI: "Creativity and Imagination Skills",
  CD: "Cognitive Development"
};

const TOOL1_SCORE_OPTIONS = ["0", "1", "2", "A"];
const TOOL1_SCORE_COLORS = {
  "0": { bg: "#fecaca", fg: "#7f1d1d" },
  "1": { bg: "#fde68a", fg: "#78350f" },
  "2": { bg: "#bbf7d0", fg: "#14532d" },
  "A": { bg: "#a78bfa", fg: "#ffffff" }
};
const TOOL1_SCORE_LEGEND = {
  "0": "Not Yet Achieved",
  "1": "Partially Achieved or Achieved with support",
  "2": "Achieved Independently",
  "A": "Refused to take part or is temporarily absent from activity"
};
const TOOL1_NUMERIC = { "0": 0, "1": 1, "2": 2 };

const TOOL2_SCORE_OPTIONS = ["Yes", "No"];
const TOOL2_SCORE_COLORS = {
  Yes: { bg: "#bbf7d0", fg: "#14532d" },
  No: { bg: "#fecaca", fg: "#7f1d1d" }
};

// Default settings-login credentials (changeable in Settings > Security).
// Stored as SHA-256 hashes locally, never as plaintext.
const DEFAULT_ADMIN_USERNAME = "Coteadmin";
const DEFAULT_ADMIN_PASSWORD = "cote43*31!";
