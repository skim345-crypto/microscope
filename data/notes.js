// Text shown above the viewer.
// Which text appears is decided in this order:
//   1. the file's "note" in data/manifest.js (the poster uses "poster")
//   2. the file's week ("week2", "week3", ...) if you add one below
//   3. "default"
// Each entry: a title and a list of paragraphs. Edit freely.

const NOTES = {
  default: {
    title: 'Process notes',
    paragraphs: [
      "This archive documents the first phase of Creative Cryptography, a project that takes apart an object through language. I began by describing my object with five adjectives: bouncy, centered, full, infinite, and squeeze. For each word I drew twelve abstract symbols with a black Sharpie, with no pencil and no computer, sixty marks in total. The sheets were scanned, traced, and exported as SVGs, one folder per word.",
      "The symbols then went through a series of synthesis methods. In Sequence A, I grouped the words, combined the strongest symbols of each group into three refined symbols, and merged those into one final form. Sequence B reached a final form by choosing the best pairs first. Process of Elimination combined whole pages of symbols and then removed the weakest word, and Chance paired words and symbols drawn at random.",
      "Next I chose four verbs from Richard Serra's verb list, to scatter, to expand, to twist, and to fold, and applied them in p5.js to the five forms that stood out most. Those studies became the material for the final 36 × 48 inch poster."
    ]
  },

  poster: {
    title: 'Colony, Migration, and the Shapes in Between',
    paragraphs: [
      "This 36 × 48 inch poster brings together the verb studies from week 4. Using a p5.js tool, I applied four actions, scatter, expand, twist, and fold, to five forms from the synthesis stage, and treated the results as raw material rather than finished images.",
      "Seen together, the studies read as the behavior of a group: bodies that scatter, spread outward, spin into a single current, and fold themselves into narrow gaps. That became the question of the poster, how small bodies move together. The shapes become tracks, and chains of dots travel along them like a colony in migration. The theme also connects to my other work this semester on the colonies and movements of small organisms.",
      "The type follows the same logic. The letters of COLONY and MIGRATION are scattered across the surface, some standing alone and some riding the dotted paths, so the words have to be gathered by the reader the way the bodies gather themselves. The poster was printed as tiled Tabloid sheets and assembled by hand for the pin-up."
    ]
  },

  // Example: uncomment to give week 4 its own text
  // week4: {
  //   title: 'Week 4',
  //   paragraphs: ['...']
  // },
};
