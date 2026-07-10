"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameLeaderboard, { addScore } from "./GameLeaderboard";

/* ------------------------------------------------------------------ */
/*  Data types                                                         */
/* ------------------------------------------------------------------ */

interface Sentence {
  text: string;
  isHallucination: boolean;
  explanation: string;
}

interface Paragraph {
  topic: string;
  sentences: Sentence[];
  difficulty: number; // 0 = easy, 1 = medium, 2 = hard
}

/* ------------------------------------------------------------------ */
/*  Dataset: 50 paragraphs with plausible hallucinations               */
/* ------------------------------------------------------------------ */

const paragraphs: Paragraph[] = [
  // ── EASY (difficulty 0) ──────────────────────────────────────────
  {
    topic: "Space Exploration",
    difficulty: 0,
    sentences: [
      { text: "The Apollo 11 mission landed the first humans on the Moon in 1969.", isHallucination: false, explanation: "Correct. Apollo 11 landed on July 20, 1969." },
      { text: "Neil Armstrong was the first person to walk on the lunar surface.", isHallucination: false, explanation: "Correct. Armstrong stepped onto the Moon before Buzz Aldrin." },
      { text: "The mission launched from Cape Canaveral in Florida.", isHallucination: false, explanation: "Correct. It launched from Kennedy Space Center at Cape Canaveral." },
      { text: "Armstrong's first words on the Moon were 'One giant leap for America, one giant leap for mankind.'", isHallucination: true, explanation: "Hallucination. The actual quote was 'That's one small step for man, one giant leap for mankind.'" },
    ],
  },
  {
    topic: "Geography",
    difficulty: 0,
    sentences: [
      { text: "Mount Everest is the tallest mountain in the world, standing at 8,849 meters.", isHallucination: false, explanation: "Correct. Everest's height was updated to 8,849m by a 2020 survey." },
      { text: "It is located on the border between Nepal and China.", isHallucination: false, explanation: "Correct. Everest sits on the Nepal-China (Tibet) border." },
      { text: "The first confirmed summit was by Edmund Hillary and Tenzing Norgay in 1953.", isHallucination: false, explanation: "Correct. They reached the summit on May 29, 1953." },
      { text: "The mountain was named after Sir George Everest, who was the first European to see it.", isHallucination: true, explanation: "Hallucination. George Everest was the Surveyor General of India and never actually saw the mountain. It was named in his honor by his successor Andrew Waugh." },
    ],
  },
  {
    topic: "Biology",
    difficulty: 0,
    sentences: [
      { text: "DNA stands for deoxyribonucleic acid.", isHallucination: false, explanation: "Correct. That is the full name." },
      { text: "The double helix structure of DNA was described by Watson and Crick in 1953.", isHallucination: false, explanation: "Correct. Their paper was published in Nature in April 1953." },
      { text: "Human DNA contains approximately 3 billion base pairs.", isHallucination: false, explanation: "Correct. The human genome has roughly 3.2 billion base pairs." },
      { text: "Humans share about 60% of their DNA with bananas.", isHallucination: false, explanation: "Correct. Humans share roughly 60% of their genes with bananas." },
      { text: "DNA was first discovered by Alexander Fleming in 1871.", isHallucination: true, explanation: "Hallucination. DNA was first isolated by Friedrich Miescher in 1869. Alexander Fleming discovered penicillin." },
    ],
  },
  {
    topic: "Ancient Rome",
    difficulty: 0,
    sentences: [
      { text: "The Colosseum in Rome was completed in 80 AD under Emperor Titus.", isHallucination: false, explanation: "Correct. Construction began under Vespasian and was completed under Titus." },
      { text: "At its peak, the Colosseum could hold between 50,000 and 80,000 spectators.", isHallucination: false, explanation: "Correct. Estimates range in that bracket." },
      { text: "Julius Caesar was assassinated on the Ides of March, 44 BC.", isHallucination: false, explanation: "Correct. He was killed on March 15, 44 BC." },
      { text: "Caesar was stabbed 23 times by a group of over 40 senators.", isHallucination: true, explanation: "Hallucination. While he was stabbed 23 times, the group of conspirators numbered about 60 senators, not 40. The key inaccuracy is the group size." },
    ],
  },
  {
    topic: "World War II",
    difficulty: 0,
    sentences: [
      { text: "World War II began in Europe on September 1, 1939, when Germany invaded Poland.", isHallucination: false, explanation: "Correct. Germany's invasion of Poland triggered Britain and France to declare war." },
      { text: "D-Day, the Allied invasion of Normandy, took place on June 6, 1944.", isHallucination: false, explanation: "Correct. Operation Overlord began on that date." },
      { text: "The war in Europe ended on May 8, 1945, known as V-E Day.", isHallucination: false, explanation: "Correct. Germany surrendered unconditionally." },
      { text: "The atomic bomb dropped on Hiroshima on August 6, 1945, was codenamed 'Fat Man.'", isHallucination: true, explanation: "Hallucination. The Hiroshima bomb was codenamed 'Little Boy.' 'Fat Man' was dropped on Nagasaki three days later." },
    ],
  },
  {
    topic: "Technology",
    difficulty: 0,
    sentences: [
      { text: "The World Wide Web was invented by Tim Berners-Lee in 1989.", isHallucination: false, explanation: "Correct. Berners-Lee proposed the web while working at CERN." },
      { text: "The first website went live in 1991.", isHallucination: false, explanation: "Correct. The first website was info.cern.ch, launched in August 1991." },
      { text: "The internet and the World Wide Web are not the same thing.", isHallucination: false, explanation: "Correct. The internet is the network infrastructure; the web is an application built on top of it." },
      { text: "Berners-Lee was awarded the Nobel Prize in Physics for his invention.", isHallucination: true, explanation: "Hallucination. There is no Nobel Prize category for computer science. Berners-Lee received a Turing Award in 2016 and was knighted." },
    ],
  },
  {
    topic: "Music",
    difficulty: 0,
    sentences: [
      { text: "The Beatles were a British rock band formed in Liverpool in 1960.", isHallucination: false, explanation: "Correct. The band was formed in Liverpool." },
      { text: "The band consisted of John Lennon, Paul McCartney, George Harrison, and Ringo Starr.", isHallucination: false, explanation: "Correct. These were the four members of the classic lineup." },
      { text: "Their debut album 'Please Please Me' was released in 1963.", isHallucination: false, explanation: "Correct. Released on March 22, 1963." },
      { text: "Abbey Road was the last album the Beatles recorded, and it was released in September 1968.", isHallucination: true, explanation: "Hallucination. Abbey Road was released in September 1969, not 1968. 'Let It Be' was released after Abbey Road but was mostly recorded earlier." },
    ],
  },
  {
    topic: "Chemistry",
    difficulty: 0,
    sentences: [
      { text: "Water is composed of two hydrogen atoms and one oxygen atom.", isHallucination: false, explanation: "Correct. The chemical formula is H2O." },
      { text: "The periodic table was first published by Dmitri Mendeleev in 1869.", isHallucination: false, explanation: "Correct. Mendeleev organized elements by atomic weight." },
      { text: "Gold has the chemical symbol Au, derived from the Latin word 'aurum.'", isHallucination: false, explanation: "Correct. 'Aurum' means 'shining dawn' in Latin." },
      { text: "The element with atomic number 1 is helium.", isHallucination: true, explanation: "Hallucination. Hydrogen has atomic number 1. Helium has atomic number 2." },
    ],
  },
  // ── MEDIUM (difficulty 1) ────────────────────────────────────────
  {
    topic: "Artificial Intelligence",
    difficulty: 1,
    sentences: [
      { text: "GPT-3, released by OpenAI in 2020, has 175 billion parameters.", isHallucination: false, explanation: "Correct. GPT-3 has 175 billion parameters." },
      { text: "The Transformer architecture was introduced in the 2017 paper 'Attention Is All You Need.'", isHallucination: false, explanation: "Correct. Published by Vaswani et al. at Google." },
      { text: "GPT stands for Generative Pre-trained Transformer.", isHallucination: false, explanation: "Correct. That is the full acronym." },
      { text: "The original Transformer paper was authored by a team at Meta AI Research.", isHallucination: true, explanation: "Hallucination. The 'Attention Is All You Need' paper was authored by researchers at Google Brain and Google Research, not Meta." },
      { text: "Large language models are trained using a process called self-supervised learning.", isHallucination: false, explanation: "Correct. LLMs are typically pre-trained using self-supervised objectives like next-token prediction." },
    ],
  },
  {
    topic: "Physics",
    difficulty: 1,
    sentences: [
      { text: "Albert Einstein published his theory of general relativity in 1915.", isHallucination: false, explanation: "Correct. General relativity was published in November 1915." },
      { text: "Einstein received the Nobel Prize in Physics in 1921 for the photoelectric effect.", isHallucination: false, explanation: "Correct. He received it for his explanation of the photoelectric effect, not relativity." },
      { text: "The speed of light in a vacuum is approximately 299,792 kilometers per second.", isHallucination: false, explanation: "Correct. This is the accepted value." },
      { text: "Einstein's famous equation E=mc2 was first published in his 1905 paper on Brownian motion.", isHallucination: true, explanation: "Hallucination. E=mc2 appeared in a separate 1905 paper on mass-energy equivalence, not the one on Brownian motion. Einstein published four groundbreaking papers that year on different topics." },
    ],
  },
  {
    topic: "American History",
    difficulty: 1,
    sentences: [
      { text: "The Declaration of Independence was adopted on July 4, 1776.", isHallucination: false, explanation: "Correct. The Continental Congress voted to approve it on that date." },
      { text: "Thomas Jefferson was the principal author of the Declaration.", isHallucination: false, explanation: "Correct. Jefferson drafted the document." },
      { text: "The Constitution of the United States was ratified in 1788.", isHallucination: false, explanation: "Correct. New Hampshire became the ninth state to ratify on June 21, 1788." },
      { text: "George Washington served three terms as the first President of the United States.", isHallucination: true, explanation: "Hallucination. Washington served two terms (1789 to 1797), not three. He voluntarily stepped down after his second term." },
    ],
  },
  {
    topic: "Machine Learning",
    difficulty: 1,
    sentences: [
      { text: "Convolutional neural networks (CNNs) are widely used for image recognition tasks.", isHallucination: false, explanation: "Correct. CNNs are the backbone of most computer vision systems." },
      { text: "The ImageNet Large Scale Visual Recognition Challenge was a major benchmark for image classification.", isHallucination: false, explanation: "Correct. ImageNet has been instrumental in advancing computer vision." },
      { text: "AlexNet, which won the 2012 ImageNet competition, was developed by Alex Krizhevsky and colleagues at the University of Toronto.", isHallucination: false, explanation: "Correct. Krizhevsky, Sutskever, and Hinton developed AlexNet." },
      { text: "The breakthrough in AlexNet was its use of recurrent layers to process image data sequentially.", isHallucination: true, explanation: "Hallucination. AlexNet used convolutional layers, ReLU activations, and GPU training. Recurrent layers are for sequential data, not image classification." },
      { text: "Dropout is a regularization technique that helps prevent overfitting.", isHallucination: false, explanation: "Correct. Dropout randomly deactivates neurons during training to improve generalization." },
    ],
  },
  {
    topic: "Sports",
    difficulty: 1,
    sentences: [
      { text: "The FIFA World Cup is held every four years.", isHallucination: false, explanation: "Correct. The men's World Cup takes place every four years." },
      { text: "Brazil has won the most World Cup titles with five victories.", isHallucination: false, explanation: "Correct. Brazil has won in 1958, 1962, 1970, 1994, and 2002." },
      { text: "The 2022 World Cup was held in Qatar.", isHallucination: false, explanation: "Correct. It was the first World Cup held in the Middle East." },
      { text: "Argentina won the 2022 World Cup by beating France 4-2 on penalties after a 2-2 draw.", isHallucination: true, explanation: "Hallucination. The match ended 3-3 after extra time, then Argentina won 4-2 on penalties." },
    ],
  },
  {
    topic: "Geography: Oceans",
    difficulty: 1,
    sentences: [
      { text: "The Pacific Ocean is the largest and deepest ocean on Earth.", isHallucination: false, explanation: "Correct. The Pacific covers more area than all land combined." },
      { text: "The Mariana Trench, the deepest point in the ocean, reaches about 11,034 meters.", isHallucination: false, explanation: "Correct. The Challenger Deep in the Mariana Trench reaches approximately that depth." },
      { text: "The Atlantic Ocean is the second-largest ocean.", isHallucination: false, explanation: "Correct. It is second to the Pacific in size." },
      { text: "The Southern Ocean was officially recognized as the fifth ocean by the International Hydrographic Organization in 1999.", isHallucination: true, explanation: "Hallucination. The IHO drafted a proposal in 2000 but never formally ratified it. National Geographic recognized it as the fifth ocean in 2021." },
    ],
  },
  {
    topic: "Literature",
    difficulty: 1,
    sentences: [
      { text: "William Shakespeare was born in Stratford-upon-Avon in 1564.", isHallucination: false, explanation: "Correct. He was baptized on April 26, 1564." },
      { text: "'Hamlet' is one of Shakespeare's most famous tragedies.", isHallucination: false, explanation: "Correct. Hamlet is among his best-known works." },
      { text: "Shakespeare wrote approximately 37 plays during his career.", isHallucination: false, explanation: "Correct. The traditionally accepted count is 37 plays." },
      { text: "Shakespeare also wrote 'Don Quixote,' which is considered the first modern novel.", isHallucination: true, explanation: "Hallucination. 'Don Quixote' was written by Miguel de Cervantes, not Shakespeare." },
    ],
  },
  {
    topic: "Modern Technology",
    difficulty: 1,
    sentences: [
      { text: "The first iPhone was released by Apple in June 2007.", isHallucination: false, explanation: "Correct. It was released on June 29, 2007." },
      { text: "Steve Jobs unveiled the iPhone at the Macworld Conference.", isHallucination: false, explanation: "Correct. He presented it at Macworld on January 9, 2007." },
      { text: "The original iPhone had a 3.5-inch touchscreen display.", isHallucination: false, explanation: "Correct. The first iPhone had a 3.5-inch screen." },
      { text: "The original iPhone was available on both AT&T and Verizon networks at launch.", isHallucination: true, explanation: "Hallucination. The original iPhone was exclusive to AT&T (Cingular). Verizon did not get an iPhone until 2011 with the iPhone 4." },
    ],
  },
  {
    topic: "Astronomy",
    difficulty: 1,
    sentences: [
      { text: "Pluto was reclassified as a dwarf planet by the International Astronomical Union in 2006.", isHallucination: false, explanation: "Correct. The IAU adopted this classification on August 24, 2006." },
      { text: "The Hubble Space Telescope was launched in 1990.", isHallucination: false, explanation: "Correct. It was deployed from the Space Shuttle Discovery on April 24, 1990." },
      { text: "Jupiter is the largest planet in our solar system.", isHallucination: false, explanation: "Correct. Jupiter has the greatest mass and volume." },
      { text: "Saturn's largest moon, Europa, is thought to have a subsurface ocean.", isHallucination: true, explanation: "Hallucination. Europa is a moon of Jupiter, not Saturn. Saturn's largest moon is Titan." },
      { text: "The Sun accounts for about 99.86% of the mass in our solar system.", isHallucination: false, explanation: "Correct. The Sun contains the vast majority of mass in the solar system." },
    ],
  },
  {
    topic: "Architecture",
    difficulty: 1,
    sentences: [
      { text: "The Eiffel Tower was completed in 1889 for the World's Fair in Paris.", isHallucination: false, explanation: "Correct. It was built for the 1889 Exposition Universelle." },
      { text: "Gustave Eiffel's company designed and built the tower.", isHallucination: false, explanation: "Correct. The Compagnie des Etablissements Eiffel built it." },
      { text: "The tower stands at 330 meters tall, including its antenna.", isHallucination: false, explanation: "Correct. With the antenna, it is 330 meters (1,083 feet)." },
      { text: "The Eiffel Tower was originally painted red before being changed to its current bronze color.", isHallucination: true, explanation: "Hallucination. The tower was originally painted reddish-brown (Venetian red), not plain red. It has been repainted multiple times and was changed to a bronze/brown shade over the years." },
    ],
  },
  {
    topic: "Pop Culture",
    difficulty: 1,
    sentences: [
      { text: "The first Star Wars film was released in 1977.", isHallucination: false, explanation: "Correct. 'Star Wars' (later subtitled 'A New Hope') premiered on May 25, 1977." },
      { text: "George Lucas directed the original Star Wars film.", isHallucination: false, explanation: "Correct. Lucas wrote and directed the first film." },
      { text: "Harrison Ford played the character Han Solo.", isHallucination: false, explanation: "Correct. Ford portrayed Han Solo in the original trilogy." },
      { text: "'The Empire Strikes Back' was directed by George Lucas and released in 1981.", isHallucination: true, explanation: "Hallucination. 'The Empire Strikes Back' was directed by Irvin Kershner and released in 1980, not 1981." },
    ],
  },
  {
    topic: "Mathematics",
    difficulty: 1,
    sentences: [
      { text: "Pi (the ratio of a circle's circumference to its diameter) is an irrational number.", isHallucination: false, explanation: "Correct. Pi cannot be expressed as a ratio of two integers." },
      { text: "The value of pi begins with 3.14159.", isHallucination: false, explanation: "Correct. Those are the first six digits." },
      { text: "Euler's number (e) is approximately 2.71828.", isHallucination: false, explanation: "Correct. That is the standard approximation." },
      { text: "The Pythagorean theorem was first proven by Pythagoras in the 3rd century BC.", isHallucination: true, explanation: "Hallucination. Pythagoras lived in the 6th century BC, not the 3rd. The theorem was also known to Babylonians long before him." },
    ],
  },
  // ── HARD (difficulty 2) ──────────────────────────────────────────
  {
    topic: "Neuroscience",
    difficulty: 2,
    sentences: [
      { text: "The human brain contains approximately 86 billion neurons.", isHallucination: false, explanation: "Correct. Research by Suzana Herculano-Houzel estimated 86 billion neurons." },
      { text: "Neurons communicate through electrical and chemical signals at junctions called synapses.", isHallucination: false, explanation: "Correct. Synapses are the gaps between neurons where signaling occurs." },
      { text: "The prefrontal cortex is associated with decision-making and planning.", isHallucination: false, explanation: "Correct. The prefrontal cortex handles executive functions." },
      { text: "The hippocampus, located in the frontal lobe, is essential for forming new memories.", isHallucination: true, explanation: "Hallucination. The hippocampus is located in the medial temporal lobe, not the frontal lobe." },
      { text: "Neuroplasticity is the brain's ability to reorganize itself by forming new neural connections.", isHallucination: false, explanation: "Correct. The brain can adapt throughout life." },
    ],
  },
  {
    topic: "Climate Science",
    difficulty: 2,
    sentences: [
      { text: "Carbon dioxide (CO2) is a greenhouse gas that traps heat in Earth's atmosphere.", isHallucination: false, explanation: "Correct. CO2 absorbs and re-emits infrared radiation." },
      { text: "The Keeling Curve tracks atmospheric CO2 concentrations measured at Mauna Loa Observatory in Hawaii.", isHallucination: false, explanation: "Correct. Started by Charles David Keeling in 1958." },
      { text: "The Paris Agreement of 2015 aims to limit global warming to well below 2 degrees Celsius above pre-industrial levels.", isHallucination: false, explanation: "Correct. The agreement targets below 2C with efforts toward 1.5C." },
      { text: "The Intergovernmental Panel on Climate Change (IPCC) was established in 1988 by the World Health Organization and UNEP.", isHallucination: true, explanation: "Hallucination. The IPCC was established by the World Meteorological Organization (WMO) and UNEP, not the World Health Organization." },
      { text: "Methane is a greenhouse gas that is more potent than CO2 over a 20-year period.", isHallucination: false, explanation: "Correct. Methane has roughly 80 times the warming potential of CO2 over 20 years." },
    ],
  },
  {
    topic: "Economics",
    difficulty: 2,
    sentences: [
      { text: "Adam Smith is often called the father of modern economics.", isHallucination: false, explanation: "Correct. His 1776 work 'The Wealth of Nations' is foundational." },
      { text: "Inflation refers to a sustained increase in the general price level of goods and services.", isHallucination: false, explanation: "Correct. That is the standard definition of inflation." },
      { text: "The US Federal Reserve was established in 1913.", isHallucination: false, explanation: "Correct. The Federal Reserve Act was signed on December 23, 1913." },
      { text: "John Maynard Keynes published 'The General Theory of Employment, Interest and Money' in 1929, right before the Great Depression.", isHallucination: true, explanation: "Hallucination. Keynes published this work in 1936, during the Depression, not in 1929 before it." },
      { text: "GDP stands for Gross Domestic Product.", isHallucination: false, explanation: "Correct. GDP measures the total value of goods and services produced within a country." },
    ],
  },
  {
    topic: "Genetics",
    difficulty: 2,
    sentences: [
      { text: "CRISPR-Cas9 is a gene-editing tool adapted from a natural defense system in bacteria.", isHallucination: false, explanation: "Correct. CRISPR evolved in bacteria as an immune defense against viruses." },
      { text: "Jennifer Doudna and Emmanuelle Charpentier won the 2020 Nobel Prize in Chemistry for developing CRISPR.", isHallucination: false, explanation: "Correct. They shared the 2020 Nobel Prize in Chemistry." },
      { text: "The Human Genome Project was completed in 2003 after 13 years of research.", isHallucination: false, explanation: "Correct. It began in 1990 and was declared complete in April 2003." },
      { text: "Humans have 24 pairs of chromosomes in each cell.", isHallucination: true, explanation: "Hallucination. Humans have 23 pairs of chromosomes (46 total), not 24. Great apes have 24 pairs." },
    ],
  },
  {
    topic: "Computer Science",
    difficulty: 2,
    sentences: [
      { text: "Alan Turing is widely considered the father of theoretical computer science.", isHallucination: false, explanation: "Correct. Turing formalized computation with his Turing machine concept." },
      { text: "The Turing Test proposes a way to evaluate whether a machine can exhibit intelligent behavior.", isHallucination: false, explanation: "Correct. Described in Turing's 1950 paper 'Computing Machinery and Intelligence.'" },
      { text: "Turing worked at Bletchley Park during WWII to help break German Enigma codes.", isHallucination: false, explanation: "Correct. Turing played a key role in decrypting Enigma messages." },
      { text: "The first programmable electronic computer, ENIAC, was built at MIT in 1945.", isHallucination: true, explanation: "Hallucination. ENIAC was built at the University of Pennsylvania, not MIT. It was completed in 1945 and publicly revealed in 1946." },
      { text: "Modern computers use binary (base-2) number systems at the hardware level.", isHallucination: false, explanation: "Correct. Digital computers represent data using binary digits (bits)." },
    ],
  },
  {
    topic: "Philosophy",
    difficulty: 2,
    sentences: [
      { text: "Socrates is considered one of the founders of Western philosophy.", isHallucination: false, explanation: "Correct. Along with Plato and Aristotle, Socrates is foundational to Western thought." },
      { text: "Plato was a student of Socrates and the teacher of Aristotle.", isHallucination: false, explanation: "Correct. This is the standard philosophical lineage." },
      { text: "Plato founded the Academy in Athens, one of the earliest institutions of higher learning.", isHallucination: false, explanation: "Correct. Founded around 387 BC." },
      { text: "Aristotle's most famous work, 'Meditations,' explored metaphysics and ethics.", isHallucination: true, explanation: "Hallucination. 'Meditations' was written by Marcus Aurelius. Aristotle's major works include 'Nicomachean Ethics' and 'Metaphysics.'" },
      { text: "Socrates was sentenced to death by drinking hemlock in 399 BC.", isHallucination: false, explanation: "Correct. He was convicted and executed by drinking poison hemlock." },
    ],
  },
  {
    topic: "Oceanography",
    difficulty: 2,
    sentences: [
      { text: "Coral reefs support approximately 25% of all marine species despite covering less than 1% of the ocean floor.", isHallucination: false, explanation: "Correct. Coral reefs are often called the rainforests of the sea." },
      { text: "The Great Barrier Reef is the world's largest coral reef system, stretching over 2,300 kilometers.", isHallucination: false, explanation: "Correct. It is located off the coast of Queensland, Australia." },
      { text: "Ocean acidification is caused by the absorption of excess CO2 from the atmosphere.", isHallucination: false, explanation: "Correct. CO2 dissolves in seawater to form carbonic acid, lowering pH." },
      { text: "The average depth of the world's oceans is approximately 2,700 meters.", isHallucination: true, explanation: "Hallucination. The average ocean depth is approximately 3,688 meters (about 12,100 feet), not 2,700 meters." },
    ],
  },
  {
    topic: "Modern AI Research",
    difficulty: 2,
    sentences: [
      { text: "Reinforcement learning from human feedback (RLHF) is a technique used to align language models with human preferences.", isHallucination: false, explanation: "Correct. RLHF trains a reward model from human comparisons and uses it to fine-tune the language model." },
      { text: "The concept of attention mechanisms in neural networks predates the Transformer architecture.", isHallucination: false, explanation: "Correct. Attention was used in sequence-to-sequence models (e.g., Bahdanau attention in 2014) before the 2017 Transformer paper." },
      { text: "DeepMind's AlphaGo defeated Go world champion Lee Sedol in 2016.", isHallucination: false, explanation: "Correct. AlphaGo won 4 games to 1 in March 2016." },
      { text: "The term 'artificial intelligence' was first coined at the Stanford Workshop in 1956.", isHallucination: true, explanation: "Hallucination. The term was coined at the Dartmouth Workshop (Dartmouth Summer Research Project on Artificial Intelligence) in 1956, not a Stanford workshop." },
    ],
  },
  {
    topic: "Medicine",
    difficulty: 2,
    sentences: [
      { text: "Penicillin was discovered by Alexander Fleming in 1928.", isHallucination: false, explanation: "Correct. Fleming noticed that mold had killed bacteria in a petri dish." },
      { text: "The first successful human heart transplant was performed by Christiaan Barnard in 1967.", isHallucination: false, explanation: "Correct. It was performed on December 3, 1967, in Cape Town, South Africa." },
      { text: "Edward Jenner developed the first successful smallpox vaccine in 1796.", isHallucination: false, explanation: "Correct. Jenner used cowpox material to create immunity to smallpox." },
      { text: "The World Health Organization declared smallpox eradicated in 1979.", isHallucination: true, explanation: "Hallucination. The WHO officially declared smallpox eradicated in May 1980 following certification. The last natural case was in 1977." },
      { text: "Insulin was first used to treat diabetes in a human patient in 1922.", isHallucination: false, explanation: "Correct. Leonard Thompson received the first insulin injection in January 1922." },
    ],
  },
  {
    topic: "Linguistics",
    difficulty: 2,
    sentences: [
      { text: "Mandarin Chinese is the most spoken language in the world by total number of speakers.", isHallucination: false, explanation: "Correct. Including both native and second-language speakers, Mandarin (and English, depending on the source) tops the list." },
      { text: "The Rosetta Stone was key to deciphering Egyptian hieroglyphics.", isHallucination: false, explanation: "Correct. It contained the same text in hieroglyphics, Demotic, and Greek." },
      { text: "Noam Chomsky proposed the theory of universal grammar.", isHallucination: false, explanation: "Correct. Chomsky argued that the ability to acquire language is innate." },
      { text: "The Rosetta Stone was discovered by French soldiers in Egypt in 1801.", isHallucination: true, explanation: "Hallucination. The Rosetta Stone was discovered in 1799 (July 15, 1799), not 1801." },
    ],
  },
  {
    topic: "Cryptography",
    difficulty: 2,
    sentences: [
      { text: "RSA encryption is named after its inventors Rivest, Shamir, and Adleman.", isHallucination: false, explanation: "Correct. Ron Rivest, Adi Shamir, and Leonard Adleman published the algorithm in 1977." },
      { text: "Public-key cryptography allows two parties to communicate securely without sharing a secret key in advance.", isHallucination: false, explanation: "Correct. This is the core innovation of asymmetric encryption." },
      { text: "The RSA algorithm relies on the difficulty of factoring large prime numbers.", isHallucination: false, explanation: "Correct. RSA security depends on the computational difficulty of factoring large semiprimes." },
      { text: "The Advanced Encryption Standard (AES) was adopted by the US government in 2001 to replace the RSA algorithm.", isHallucination: true, explanation: "Hallucination. AES replaced the Data Encryption Standard (DES), not RSA. AES and RSA serve different purposes: AES is symmetric, RSA is asymmetric." },
      { text: "SHA-256 is a cryptographic hash function used in Bitcoin mining.", isHallucination: false, explanation: "Correct. Bitcoin uses SHA-256 for its proof-of-work algorithm." },
    ],
  },
  {
    topic: "Paleontology",
    difficulty: 2,
    sentences: [
      { text: "The asteroid that likely caused the extinction of the dinosaurs struck Earth about 66 million years ago.", isHallucination: false, explanation: "Correct. The Chicxulub impact occurred approximately 66 million years ago." },
      { text: "The impact crater is located near the Yucatan Peninsula in Mexico.", isHallucination: false, explanation: "Correct. The Chicxulub crater is centered offshore near the town of Chicxulub, Mexico." },
      { text: "Tyrannosaurus rex was one of the largest land predators ever to exist.", isHallucination: false, explanation: "Correct. T. rex could reach up to 12 meters in length." },
      { text: "The first T. rex fossil was discovered by paleontologist Edward Cope in 1902.", isHallucination: true, explanation: "Hallucination. The first T. rex fossil was discovered by Barnum Brown in 1902. Edward Cope died in 1897 and was famous for the Bone Wars with Othniel Marsh." },
    ],
  },
  {
    topic: "Renaissance Art",
    difficulty: 2,
    sentences: [
      { text: "Leonardo da Vinci painted the Mona Lisa, which is displayed in the Louvre Museum.", isHallucination: false, explanation: "Correct. The Mona Lisa has been in the Louvre since the French Revolution." },
      { text: "Michelangelo painted the ceiling of the Sistine Chapel between 1508 and 1512.", isHallucination: false, explanation: "Correct. He was commissioned by Pope Julius II." },
      { text: "The Renaissance period is generally considered to have begun in Italy in the 14th century.", isHallucination: false, explanation: "Correct. It began in Florence in the late 1300s." },
      { text: "Raphael's 'The Birth of Venus' is one of the most famous paintings of the Renaissance.", isHallucination: true, explanation: "Hallucination. 'The Birth of Venus' was painted by Sandro Botticelli, not Raphael. Raphael is known for works like 'The School of Athens.'" },
      { text: "Da Vinci's 'The Last Supper' is a mural painting located in Milan, Italy.", isHallucination: false, explanation: "Correct. It is in the refectory of the Convent of Santa Maria delle Grazie." },
    ],
  },
  {
    topic: "Quantum Computing",
    difficulty: 2,
    sentences: [
      { text: "Quantum computers use qubits instead of classical bits.", isHallucination: false, explanation: "Correct. Qubits can exist in superposition of states." },
      { text: "A qubit can represent both 0 and 1 simultaneously through quantum superposition.", isHallucination: false, explanation: "Correct. This is a fundamental property of quantum systems." },
      { text: "Google claimed to achieve quantum supremacy in 2019 with its Sycamore processor.", isHallucination: false, explanation: "Correct. Google published this claim in Nature in October 2019." },
      { text: "Shor's algorithm, which can factor large numbers efficiently, was developed by Peter Shor at MIT in 1997.", isHallucination: true, explanation: "Hallucination. Peter Shor developed the algorithm in 1994 while working at Bell Labs (AT&T), not MIT. He later moved to MIT." },
    ],
  },
  {
    topic: "Evolution",
    difficulty: 2,
    sentences: [
      { text: "Charles Darwin published 'On the Origin of Species' in 1859.", isHallucination: false, explanation: "Correct. The first edition was published on November 24, 1859." },
      { text: "Darwin's theory of evolution is based on natural selection.", isHallucination: false, explanation: "Correct. Natural selection is the central mechanism of Darwinian evolution." },
      { text: "Darwin developed many of his ideas during a voyage on HMS Beagle.", isHallucination: false, explanation: "Correct. The voyage lasted from 1831 to 1836." },
      { text: "Alfred Russel Wallace independently conceived a similar theory and presented it jointly with Darwin at the Royal Society in 1858.", isHallucination: true, explanation: "Hallucination. The joint presentation was at the Linnean Society of London, not the Royal Society." },
      { text: "The Galapagos Islands, which Darwin visited, are located in the Pacific Ocean.", isHallucination: false, explanation: "Correct. The Galapagos are in the eastern Pacific, about 1,000 km west of Ecuador." },
    ],
  },
  {
    topic: "Space Technology",
    difficulty: 2,
    sentences: [
      { text: "The International Space Station (ISS) orbits Earth at an altitude of roughly 400 kilometers.", isHallucination: false, explanation: "Correct. The ISS orbits between about 330 and 435 km." },
      { text: "The ISS has been continuously occupied since November 2000.", isHallucination: false, explanation: "Correct. Expedition 1 arrived on November 2, 2000." },
      { text: "SpaceX's Falcon 9 was the first orbital-class rocket to successfully land vertically after launch.", isHallucination: false, explanation: "Correct. Falcon 9 first landed successfully on December 21, 2015." },
      { text: "The James Webb Space Telescope was launched in December 2021 and is positioned at Lagrange point L1.", isHallucination: true, explanation: "Hallucination. JWST is positioned at Lagrange point L2, not L1. L2 is about 1.5 million km from Earth, on the side opposite the Sun." },
    ],
  },
  {
    topic: "Psychology",
    difficulty: 2,
    sentences: [
      { text: "Sigmund Freud is considered the founder of psychoanalysis.", isHallucination: false, explanation: "Correct. Freud developed psychoanalytic theory in the late 19th century." },
      { text: "The Stanford prison experiment was conducted by Philip Zimbardo in 1971.", isHallucination: false, explanation: "Correct. The experiment took place in August 1971." },
      { text: "Abraham Maslow proposed the hierarchy of needs theory.", isHallucination: false, explanation: "Correct. Maslow published his theory in 1943." },
      { text: "The Milgram experiment on obedience to authority was conducted at Harvard University in 1963.", isHallucination: true, explanation: "Hallucination. The Milgram experiment was conducted at Yale University, not Harvard. Stanley Milgram was a professor at Yale at the time." },
      { text: "Cognitive behavioral therapy (CBT) focuses on changing unhelpful thought patterns.", isHallucination: false, explanation: "Correct. CBT addresses the relationship between thoughts, feelings, and behaviors." },
    ],
  },
  {
    topic: "Film History",
    difficulty: 2,
    sentences: [
      { text: "The first feature-length film with synchronized dialogue was 'The Jazz Singer,' released in 1927.", isHallucination: false, explanation: "Correct. It marked the beginning of the 'talkie' era." },
      { text: "Alfred Hitchcock is known as the 'Master of Suspense.'", isHallucination: false, explanation: "Correct. Hitchcock directed classics like 'Psycho' and 'Vertigo.'" },
      { text: "'Citizen Kane,' directed by Orson Welles, is frequently cited as one of the greatest films ever made.", isHallucination: false, explanation: "Correct. Released in 1941, it regularly tops critics' polls." },
      { text: "'Citizen Kane' won the Academy Award for Best Picture in 1942.", isHallucination: true, explanation: "Hallucination. 'Citizen Kane' was nominated for nine Oscars but only won for Best Original Screenplay. Best Picture that year went to 'How Green Was My Valley.'" },
    ],
  },
  {
    topic: "Energy",
    difficulty: 2,
    sentences: [
      { text: "Nuclear fission is the process of splitting heavy atomic nuclei to release energy.", isHallucination: false, explanation: "Correct. Fission of uranium-235 or plutonium-239 releases large amounts of energy." },
      { text: "The first controlled nuclear chain reaction was achieved by Enrico Fermi's team in 1942.", isHallucination: false, explanation: "Correct. Chicago Pile-1 went critical on December 2, 1942." },
      { text: "Nuclear fusion, which powers the Sun, involves combining light nuclei to form heavier ones.", isHallucination: false, explanation: "Correct. The Sun fuses hydrogen into helium." },
      { text: "The Chernobyl disaster occurred in 1986 in what is now Russia.", isHallucination: true, explanation: "Hallucination. Chernobyl is located in Ukraine (then the Ukrainian SSR), not Russia." },
    ],
  },
  {
    topic: "Deep Learning",
    difficulty: 2,
    sentences: [
      { text: "Generative adversarial networks (GANs) were introduced by Ian Goodfellow in 2014.", isHallucination: false, explanation: "Correct. Goodfellow et al. published the GAN paper in 2014." },
      { text: "GANs consist of two neural networks, a generator and a discriminator, that compete against each other.", isHallucination: false, explanation: "Correct. The generator creates samples and the discriminator evaluates them." },
      { text: "Batch normalization is a technique that helps stabilize and speed up neural network training.", isHallucination: false, explanation: "Correct. It normalizes layer inputs to reduce internal covariate shift." },
      { text: "The ResNet architecture, which introduced residual connections, won the ImageNet competition in 2016.", isHallucination: true, explanation: "Hallucination. ResNet won the ImageNet competition in 2015, not 2016. The paper by Kaiming He et al. was published at CVPR 2016 but the competition victory was in 2015." },
      { text: "Transfer learning allows models trained on one task to be adapted for a different but related task.", isHallucination: false, explanation: "Correct. Transfer learning is widely used in modern deep learning." },
    ],
  },
  {
    topic: "Ancient Civilizations",
    difficulty: 2,
    sentences: [
      { text: "The Great Pyramid of Giza was built around 2560 BC as a tomb for Pharaoh Khufu.", isHallucination: false, explanation: "Correct. It is the oldest and largest of the three pyramids at Giza." },
      { text: "The ancient Sumerians developed one of the earliest known writing systems, called cuneiform.", isHallucination: false, explanation: "Correct. Cuneiform was developed in Mesopotamia around 3400 BC." },
      { text: "The Library of Alexandria was one of the largest and most significant libraries of the ancient world.", isHallucination: false, explanation: "Correct. It was a major center of learning in the Ptolemaic Kingdom." },
      { text: "The Hanging Gardens of Babylon are one of the Seven Wonders of the Ancient World and were built by King Darius I.", isHallucination: true, explanation: "Hallucination. The Hanging Gardens are traditionally attributed to King Nebuchadnezzar II, not Darius I (who was a Persian king, not Babylonian)." },
    ],
  },
  {
    topic: "Networking",
    difficulty: 2,
    sentences: [
      { text: "TCP/IP is the fundamental protocol suite that powers the internet.", isHallucination: false, explanation: "Correct. TCP/IP was developed by Vint Cerf and Bob Kahn." },
      { text: "HTTP stands for Hypertext Transfer Protocol.", isHallucination: false, explanation: "Correct. HTTP defines how messages are formatted and transmitted on the web." },
      { text: "DNS translates human-readable domain names into IP addresses.", isHallucination: false, explanation: "Correct. The Domain Name System is essential for internet navigation." },
      { text: "IPv6 was introduced primarily because the 32-bit address space of IPv4 was running out, and IPv6 uses 64-bit addresses.", isHallucination: true, explanation: "Hallucination. IPv6 uses 128-bit addresses, not 64-bit. This provides approximately 3.4 x 10^38 unique addresses." },
      { text: "The first message sent over ARPANET was in 1969.", isHallucination: false, explanation: "Correct. The first message was sent on October 29, 1969, from UCLA to Stanford." },
    ],
  },
  {
    topic: "Olympic Games",
    difficulty: 1,
    sentences: [
      { text: "The modern Olympic Games were revived in Athens in 1896.", isHallucination: false, explanation: "Correct. The first modern Olympics were held in Athens, Greece." },
      { text: "Pierre de Coubertin is credited with founding the modern Olympics.", isHallucination: false, explanation: "Correct. He established the International Olympic Committee in 1894." },
      { text: "The Olympic rings represent the five continents of the world.", isHallucination: false, explanation: "Correct. The five rings symbolize the union of the five inhabited continents." },
      { text: "The 2008 Summer Olympics were held in Beijing, and China topped the medal table with the most total medals.", isHallucination: true, explanation: "Hallucination. While China topped the gold medal count (51 golds), the United States won the most total medals (112 vs China's 100)." },
    ],
  },
  {
    topic: "Volcanology",
    difficulty: 1,
    sentences: [
      { text: "Mount Vesuvius destroyed the Roman city of Pompeii in 79 AD.", isHallucination: false, explanation: "Correct. The eruption buried Pompeii and Herculaneum under volcanic ash." },
      { text: "The Ring of Fire is a major area in the Pacific Ocean basin where many earthquakes and volcanic eruptions occur.", isHallucination: false, explanation: "Correct. It stretches about 40,000 km along the Pacific rim." },
      { text: "Iceland is one of the most volcanically active places on Earth because it sits on the Mid-Atlantic Ridge.", isHallucination: false, explanation: "Correct. Iceland straddles the boundary between the North American and Eurasian tectonic plates." },
      { text: "The 1883 eruption of Krakatoa in the Indian Ocean was one of the deadliest volcanic events in recorded history.", isHallucination: true, explanation: "Hallucination. Krakatoa is located in the Sunda Strait between Java and Sumatra, which is technically part of the Pacific Ocean basin, not the Indian Ocean." },
    ],
  },
  {
    topic: "Natural Language Processing",
    difficulty: 2,
    sentences: [
      { text: "Word embeddings like Word2Vec represent words as dense vectors in a continuous vector space.", isHallucination: false, explanation: "Correct. Word2Vec was introduced by Mikolov et al. at Google in 2013." },
      { text: "BERT (Bidirectional Encoder Representations from Transformers) was developed by Google and released in 2018.", isHallucination: false, explanation: "Correct. The BERT paper was published in October 2018." },
      { text: "BERT uses a masked language modeling objective during pre-training.", isHallucination: false, explanation: "Correct. BERT randomly masks tokens and trains the model to predict them." },
      { text: "GPT-4 was released by OpenAI in March 2023 and is an open-source model.", isHallucination: true, explanation: "Hallucination. While GPT-4 was indeed released in March 2023, it is not open-source. OpenAI did not release the model weights or training details." },
      { text: "Tokenization is the process of breaking text into smaller units such as words or subwords.", isHallucination: false, explanation: "Correct. Modern models often use subword tokenization like Byte Pair Encoding (BPE)." },
    ],
  },
  {
    topic: "Cold War",
    difficulty: 1,
    sentences: [
      { text: "The Berlin Wall was constructed in 1961 to separate East and West Berlin.", isHallucination: false, explanation: "Correct. Construction began on August 13, 1961." },
      { text: "The Cuban Missile Crisis occurred in October 1962.", isHallucination: false, explanation: "Correct. It was a 13-day confrontation between the US and Soviet Union." },
      { text: "The Soviet Union launched Sputnik, the first artificial satellite, in 1957.", isHallucination: false, explanation: "Correct. Sputnik 1 was launched on October 4, 1957." },
      { text: "The Berlin Wall fell on November 9, 1990, leading to German reunification.", isHallucination: true, explanation: "Hallucination. The Berlin Wall fell on November 9, 1989, not 1990. German reunification occurred on October 3, 1990." },
    ],
  },
  {
    topic: "Robotics",
    difficulty: 2,
    sentences: [
      { text: "The term 'robot' was coined by Czech writer Karel Capek in his 1920 play 'R.U.R.'", isHallucination: false, explanation: "Correct. The word comes from the Czech word 'robota' meaning forced labor." },
      { text: "Boston Dynamics is known for creating highly mobile robots like Spot and Atlas.", isHallucination: false, explanation: "Correct. Boston Dynamics has developed some of the most advanced mobile robots." },
      { text: "Isaac Asimov formulated the Three Laws of Robotics in his science fiction works.", isHallucination: false, explanation: "Correct. Asimov introduced the laws in his 1942 short story 'Runaround.'" },
      { text: "NASA's Curiosity rover landed on Mars in 2012 and is powered by a solar panel array.", isHallucination: true, explanation: "Hallucination. While Curiosity did land in 2012, it is powered by a radioisotope thermoelectric generator (RTG), not solar panels. The earlier rovers Spirit and Opportunity used solar panels." },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildRounds(): Paragraph[] {
  const easy = shuffle(paragraphs.filter((p) => p.difficulty === 0));
  const medium = shuffle(paragraphs.filter((p) => p.difficulty === 1));
  const hard = shuffle(paragraphs.filter((p) => p.difficulty === 2));
  // First 3 easy, then medium, then hard, until we run out
  return [...easy.slice(0, 3), ...medium, ...hard, ...easy.slice(3)];
}

const STREAK_TIERS = [
  { min: 10, label: "LEGENDARY", mult: 5 },
  { min: 7, label: "ON FIRE", mult: 4 },
  { min: 5, label: "HOT STREAK", mult: 3 },
  { min: 3, label: "STREAK!", mult: 2 },
] as const;

function getStreakInfo(streak: number) {
  for (const tier of STREAK_TIERS) {
    if (streak >= tier.min) return tier;
  }
  return null;
}

const LS_KEY = "portal-hallucination-scores";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

type Phase = "ready" | "playing" | "reviewing" | "gameover";

export default function HallucinationHunterGame() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [rounds, setRounds] = useState<Paragraph[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [roundResult, setRoundResult] = useState<{
    correctFlags: number;
    falsePositives: number;
    missed: number;
    perfect: boolean;
    pointsEarned: number;
  } | null>(null);
  const [lbRefreshKey, setLbRefreshKey] = useState(0);
  const [nameInput, setNameInput] = useState("");
  const [scoreSaved, setScoreSaved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const particleIdRef = useRef(0);

  const currentParagraph = rounds[roundIdx] ?? null;
  const maxStrikes = 3;

  // Clean up flash timer
  useEffect(() => {
    if (!flashColor) return;
    const timer = setTimeout(() => setFlashColor(null), 400);
    return () => clearTimeout(timer);
  }, [flashColor]);

  // Clean up particles
  useEffect(() => {
    if (particles.length === 0) return;
    const timer = setTimeout(() => setParticles([]), 1500);
    return () => clearTimeout(timer);
  }, [particles]);

  const startGame = useCallback(() => {
    setRounds(buildRounds());
    setRoundIdx(0);
    setFlagged(new Set());
    setScore(0);
    setStreak(0);
    setStrikes(0);
    setPhase("playing");
    setRoundResult(null);
    setNameInput("");
    setScoreSaved(false);
  }, []);

  const triggerShake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }, []);

  const spawnParticles = useCallback(() => {
    const newParticles = Array.from({ length: 20 }, () => {
      particleIdRef.current += 1;
      return {
        id: particleIdRef.current,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: ["#FFD700", "#00E676", "#FF4081", "#2979FF", "#AA00FF"][Math.floor(Math.random() * 5)],
      };
    });
    setParticles(newParticles);
  }, []);

  const submitRound = useCallback(() => {
    if (!currentParagraph || phase !== "playing") return;

    const sentences = currentParagraph.sentences;
    let correctFlags = 0;
    let falsePositives = 0;
    let missed = 0;

    sentences.forEach((s, idx) => {
      const wasFlagged = flagged.has(idx);
      if (s.isHallucination && wasFlagged) correctFlags++;
      if (s.isHallucination && !wasFlagged) missed++;
      if (!s.isHallucination && wasFlagged) falsePositives++;
    });

    const perfect = correctFlags === sentences.filter((s) => s.isHallucination).length && falsePositives === 0;
    const newStreak = perfect ? streak + 1 : 0;
    const streakInfo = getStreakInfo(newStreak);
    const multiplier = streakInfo ? streakInfo.mult : 1;

    let pointsEarned = correctFlags * 10 - falsePositives * 5;
    if (perfect) pointsEarned += 15; // perfect round bonus
    pointsEarned = Math.max(0, pointsEarned) * multiplier;

    const newScore = score + pointsEarned;
    const newStrikes = strikes + missed;

    setRoundResult({ correctFlags, falsePositives, missed, perfect, pointsEarned });
    setScore(newScore);
    setStreak(newStreak);
    setStrikes(newStrikes);

    if (perfect) {
      spawnParticles();
      setFlashColor("green");
    } else if (falsePositives > 0) {
      setFlashColor("red");
    }
    if (missed > 0) {
      triggerShake();
    }

    setPhase("reviewing");

    // Check for game over after review
    if (newStrikes >= maxStrikes) {
      // Will transition to gameover after review
    }
  }, [currentParagraph, phase, flagged, score, streak, strikes, spawnParticles, triggerShake]);

  const nextRound = useCallback(() => {
    if (strikes >= maxStrikes) {
      setPhase("gameover");
      return;
    }
    const next = roundIdx + 1;
    if (next >= rounds.length) {
      setPhase("gameover");
      return;
    }
    setRoundIdx(next);
    setFlagged(new Set());
    setRoundResult(null);
    setPhase("playing");
  }, [strikes, roundIdx, rounds.length]);

  const toggleSentence = useCallback(
    (idx: number) => {
      if (phase !== "playing") return;
      setFlagged((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        return next;
      });
    },
    [phase]
  );

  const saveScore = useCallback(() => {
    if (!nameInput.trim() || scoreSaved) return;
    addScore(LS_KEY, nameInput.trim(), score);
    setScoreSaved(true);
    setLbRefreshKey((k) => k + 1);
  }, [nameInput, score, scoreSaved]);

  const streakInfo = getStreakInfo(streak);

  const difficultyLabel = (d: number) => {
    if (d === 0) return "Easy";
    if (d === 1) return "Medium";
    return "Hard";
  };

  const difficultyColor = (d: number) => {
    if (d === 0) return "text-accent-green";
    if (d === 1) return "text-gold";
    return "text-action-red";
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={containerRef}>
      {/* Flash overlay */}
      {flashColor && (
        <div
          className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-300"
          style={{
            backgroundColor: flashColor === "green" ? "rgba(0,230,118,0.15)" : "rgba(255,23,68,0.15)",
          }}
        />
      )}

      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute pointer-events-none z-40 rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: 8,
            height: 8,
            backgroundColor: p.color,
            animation: "particle-float 1.5s ease-out forwards",
          }}
        />
      ))}

      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="font-heading text-base sm:text-lg font-bold text-white uppercase tracking-wide">
            Hallucination Hunter
          </span>
        </div>
        {phase !== "ready" && (
          <div className="flex items-center gap-3 text-sm">
            <span className="font-heading text-lg font-bold text-accent-green tabular-nums">{score}</span>
            <span className="text-gray-500">pts</span>
          </div>
        )}
      </div>

      {/* ── READY ─────────────────────────────────────────────── */}
      {phase === "ready" && (
        <div className="rounded-xl border border-white/10 bg-navy-light/80 p-6 sm:p-8 text-center">
          <span className="text-6xl block mb-4">🔍</span>
          <h3 className="font-heading text-lg sm:text-xl font-bold text-white mb-2">
            Spot the Hallucination
          </h3>
          <p className="text-sm text-gray-400 mb-4 max-w-md mx-auto leading-relaxed">
            Read each paragraph carefully. Some sentences contain plausible but
            fabricated facts. Click the ones you think are hallucinated, then
            submit. Can you tell fact from fiction?
          </p>
          <ul className="text-xs text-gray-500 mb-6 space-y-1 max-w-sm mx-auto text-left">
            <li>+10 pts per correctly spotted hallucination</li>
            <li>-5 pts for flagging a real fact (false positive)</li>
            <li>+15 bonus for a perfect round (all found, zero mistakes)</li>
            <li>Streak multiplier for consecutive perfect rounds</li>
            <li>Miss a hallucination = 1 strike. Three strikes and you are out!</li>
          </ul>
          <button
            onClick={startGame}
            className="font-heading rounded-lg bg-accent-green px-8 py-3 text-sm font-bold uppercase tracking-wide text-navy transition-all hover:bg-green-300"
          >
            Start Game
          </button>
        </div>
      )}

      {/* ── PLAYING / REVIEWING ──────────────────────────────── */}
      {(phase === "playing" || phase === "reviewing") && currentParagraph && (
        <div className={shaking ? "animate-shake" : ""}>
          {/* Status bar */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              {/* Lives */}
              <div className="flex items-center gap-1">
                {Array.from({ length: maxStrikes }).map((_, i) => (
                  <span key={i} className={`text-lg ${i < maxStrikes - strikes ? "" : "opacity-20 grayscale"}`}>
                    ❤️
                  </span>
                ))}
              </div>
              {/* Streak */}
              {streakInfo && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2.5 py-0.5 text-xs font-bold text-gold animate-pulse">
                  {streakInfo.label} x{streakInfo.mult}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold ${difficultyColor(currentParagraph.difficulty)}`}>
                {difficultyLabel(currentParagraph.difficulty)}
              </span>
              <span className="text-xs text-gray-500">
                Round {roundIdx + 1}
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-xs text-gray-400">
                {currentParagraph.topic}
              </span>
            </div>
          </div>

          {/* Paragraph card */}
          <div className="rounded-xl border border-white/10 bg-navy-light/80 p-4 sm:p-6 mb-4">
            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide font-heading">
              {phase === "playing"
                ? "Click sentences you think are hallucinated"
                : "Results"}
            </p>

            <div className="space-y-2">
              {currentParagraph.sentences.map((sentence, idx) => {
                const isFlagged = flagged.has(idx);
                const isReviewing = phase === "reviewing";

                let borderClass = "border-white/10 hover:border-puzzle-purple/40";
                let bgClass = "";

                if (isFlagged && !isReviewing) {
                  borderClass = "border-puzzle-purple ring-2 ring-puzzle-purple/50";
                  bgClass = "bg-puzzle-purple/10";
                }

                if (isReviewing) {
                  if (sentence.isHallucination) {
                    borderClass = "border-action-red";
                    bgClass = "bg-action-red/10";
                  } else {
                    borderClass = "border-accent-green/50";
                    bgClass = "bg-accent-green/5";
                  }
                }

                return (
                  <div key={idx}>
                    <button
                      onClick={() => toggleSentence(idx)}
                      disabled={phase !== "playing"}
                      className={`w-full text-left rounded-lg border p-3 transition-all ${borderClass} ${bgClass} ${
                        phase === "playing" ? "cursor-pointer active:scale-[0.99]" : "cursor-default"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {/* Flag indicator */}
                        <span className="mt-0.5 flex-shrink-0 text-sm">
                          {isReviewing ? (
                            sentence.isHallucination ? (
                              isFlagged ? "✅" : "❌"
                            ) : (
                              isFlagged ? "⚠️" : "✓"
                            )
                          ) : (
                            isFlagged ? "🔍" : "○"
                          )}
                        </span>
                        <span className="text-sm text-gray-200 leading-relaxed">
                          {sentence.text}
                        </span>
                      </div>
                      {/* Review labels */}
                      {isReviewing && (
                        <div className="mt-2 ml-6">
                          <span
                            className={`inline-block text-xs font-bold uppercase tracking-wide ${
                              sentence.isHallucination ? "text-action-red" : "text-accent-green"
                            }`}
                          >
                            {sentence.isHallucination ? "HALLUCINATION" : "TRUE FACT"}
                            {sentence.isHallucination && isFlagged && " (you found it!)"}
                            {sentence.isHallucination && !isFlagged && " (missed!)"}
                            {!sentence.isHallucination && isFlagged && " (false positive!)"}
                          </span>
                          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                            {sentence.explanation}
                          </p>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          {phase === "playing" && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {flagged.size === 0
                  ? "Select suspicious sentences"
                  : `${flagged.size} sentence${flagged.size !== 1 ? "s" : ""} flagged`}
              </p>
              <button
                onClick={submitRound}
                disabled={flagged.size === 0}
                className={`font-heading rounded-lg px-6 py-2.5 text-sm font-bold uppercase tracking-wide transition-all ${
                  flagged.size > 0
                    ? "bg-puzzle-purple text-white hover:bg-purple-400"
                    : "bg-white/5 text-gray-600 cursor-not-allowed"
                }`}
              >
                Submit
              </button>
            </div>
          )}

          {/* Round result summary */}
          {phase === "reviewing" && roundResult && (
            <div className="rounded-xl border border-white/10 bg-navy-light/80 p-4 mb-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {roundResult.perfect ? "🎯" : roundResult.missed > 0 ? "💔" : "👍"}
                  </span>
                  <span className="font-heading text-sm font-bold text-white uppercase">
                    {roundResult.perfect
                      ? "Perfect Round!"
                      : roundResult.missed > 0
                        ? `${roundResult.missed} Missed`
                        : "Good Job!"}
                  </span>
                </div>
                <span className="font-heading text-lg font-bold text-accent-green">
                  +{roundResult.pointsEarned} pts
                </span>
              </div>
              <div className="flex gap-4 text-xs text-gray-400">
                <span>Found: {roundResult.correctFlags}</span>
                <span>False positives: {roundResult.falsePositives}</span>
                <span>Missed: {roundResult.missed}</span>
                {streakInfo && (
                  <span className="text-gold">Multiplier: x{streakInfo.mult}</span>
                )}
              </div>
              <div className="mt-3">
                {strikes >= maxStrikes ? (
                  <button
                    onClick={() => setPhase("gameover")}
                    className="font-heading rounded-lg bg-action-red px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all hover:bg-red-400"
                  >
                    Game Over
                  </button>
                ) : (
                  <button
                    onClick={nextRound}
                    className="font-heading rounded-lg bg-accent-green px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-navy transition-all hover:bg-green-300"
                  >
                    Next Round
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GAME OVER ────────────────────────────────────────── */}
      {phase === "gameover" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-navy-light/80 p-6 sm:p-8 text-center">
            <span className="text-5xl block mb-3">
              {score >= 500 ? "🏆" : score >= 200 ? "🌟" : score >= 100 ? "🔍" : "📝"}
            </span>
            <p className="font-heading text-3xl font-bold text-white mb-1">{score}</p>
            <p className="text-sm text-gray-400 mb-1">
              {roundIdx + 1} round{roundIdx > 0 ? "s" : ""} completed
            </p>
            <p className="text-sm text-gray-400 mb-4">
              {score >= 500
                ? "Master fact checker! Almost nothing gets past you."
                : score >= 200
                  ? "Sharp eye! You can really spot the fakes."
                  : score >= 100
                    ? "Good instincts. Keep honing that detector."
                    : score >= 50
                      ? "Decent start. The tricky ones will come with practice."
                      : "Keep trying! Hallucinations can be sneaky."}
            </p>

            {/* Save score */}
            {!scoreSaved ? (
              <div className="flex gap-2 max-w-xs mx-auto mb-4">
                <input
                  type="text"
                  placeholder="Your name"
                  maxLength={20}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveScore()}
                  className="flex-1 rounded-lg border border-white/10 bg-navy/50 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-gold focus:outline-none"
                />
                <button
                  onClick={saveScore}
                  disabled={!nameInput.trim()}
                  className="font-heading rounded-lg bg-gold px-4 py-2 text-sm font-bold uppercase text-navy transition-all hover:bg-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            ) : (
              <p className="text-gold text-sm font-bold mb-4">Score saved!</p>
            )}

            <button
              onClick={startGame}
              className="font-heading rounded-lg bg-accent-green px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-navy transition-all hover:bg-green-300"
            >
              Play Again
            </button>
          </div>

          {/* Leaderboard */}
          <GameLeaderboard gameSlug={LS_KEY} refreshKey={lbRefreshKey} />
        </div>
      )}

      {/* Inline keyframe styles */}
      <style jsx>{`
        @keyframes particle-float {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-80px) scale(0.3);
          }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        @keyframes shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
