/**
 * Just One
 * Auteurs : Sawlyer, mnsx, Tortouille
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const readline = require('readline');

// Création de l'interface de saisie
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Fonction utilitaire qui pose une question en console et retourne une Promise.
 * @param {string} query - La question affichée à l'utilisateur.
 * @returns {Promise<string>} La réponse saisie par l'utilisateur.
 */
function askQuestion(query) {
  return new Promise(resolve => rl.question(query, answer => resolve(answer)));
}

/**
 * Pseudo-base de cartes : pour la démonstration, chaque carte contient 5 mots.
 * On en sélectionne 13 cartes après mélange.
 */
const CARDS = [
  ["Europe", "Cirque", "Virus", "Crocodile", "Moutarde"],
  ["Orange", "Pyramide", "Hôpital", "Guitare", "Robot"],
  ["Souris", "Prince", "Téléphone", "Taxi", "Pizza"],
  ["Montagne", "Plage", "Chocolat", "Examen", "Arbre"],
  ["Cinéma", "Chaise", "Ordinateur", "Musique", "Rugby"],
  ["Safari", "Hamburger", "Cravate", "Bateau", "Parfum"],
  ["Fantôme", "Planète", "Docteur", "Samouraï", "Désert"],
  ["Zèbre", "Papillon", "Brosse", "Château", "Arc-en-ciel"],
  // Vous pouvez ajouter d'autres cartes ici...
];

// On mélange et on sélectionne 13 cartes
shuffleArray(CARDS);
const SELECTED_CARDS = CARDS.slice(0, 13);

/**
 * Nombre de joueurs (ici 5, mais modifiable).
 */
const NUM_PLAYERS = 5;

/**
 * Journal de partie qui enregistre chaque tour.
 */
let gameLog = [];

/**
 * Chargement asynchrone du log existant (s'il existe).
 */
async function loadGameLog() {
  try {
    const data = await fsPromises.readFile('game_log.json', 'utf-8');
    gameLog = JSON.parse(data);
  } catch (err) {
    gameLog = [];
  }
}

/**
 * Variables globales de la partie.
 */
let currentCardIndex = 0;      // On commence sur la 1ère carte (index 0)
let currentActivePlayer = 0;   // Le joueur actif (0 à NUM_PLAYERS-1)
let score = 0;                 // Nombre de cartes réussies
let playerScores = Array(NUM_PLAYERS).fill(0);

/**
 * Fonction principale qui gère un tour de jeu.
 */
async function startRound() {
  // S'il n'y a plus de cartes, la partie est terminée
  if (currentCardIndex >= SELECTED_CARDS.length) {
    endGame();
    return;
  }

  const roundNumber = currentCardIndex + 1;
  console.log(`\n===== Tour n°${roundNumber} =====`);
  console.log(`(Score actuel : ${score} réussite(s) sur ${currentCardIndex} carte(s) jouée(s))`);
  console.log(`C'est au tour du Joueur ${currentActivePlayer + 1} d'être le joueur actif.`);

  // Affichage de la carte (les 5 mots)
  const card = SELECTED_CARDS[currentCardIndex];
  console.log("Les 5 mots de la carte sont :");
  card.forEach((word, idx) => {
    console.log(`  ${idx + 1}. ${word}`);
  });

  // Le joueur actif choisit un nombre entre 1 et 5
  let input = await askQuestion(`Joueur ${currentActivePlayer + 1}, choisis un nombre entre 1 et 5 : `);
  let chosenIndex = parseInt(input, 10);
  if (isNaN(chosenIndex) || chosenIndex < 1 || chosenIndex > 5) {
    console.log("Entrée invalide, on prend 1 par défaut.");
    chosenIndex = 1;
  }
  const mysteryWord = card[chosenIndex - 1];
  console.log(`Le mot mystère à deviner est le ${chosenIndex}e mot : (caché pour le joueur actif, mais c'est "${mysteryWord}")`);

  // Recueillir les indices des autres joueurs
  let proposals = [];
  for (let playerIndex = 0; playerIndex < NUM_PLAYERS; playerIndex++) {
    if (playerIndex === currentActivePlayer) continue; // On ignore le joueur actif
    const validWord = await askForValidWord(playerIndex);
    proposals.push({ player: playerIndex, word: validWord });
  }

  // Gestion des propositions et de la phase de devinette
  await handleProposalsAndGuess(proposals, mysteryWord, chosenIndex, card);
}

/**
 * Demande à un joueur de proposer un indice (mot valide).
 * En cas d'indice invalide, la fonction se relance récursivement.
 * @param {number} playerIndex - Numéro du joueur (0 à NUM_PLAYERS-1)
 * @returns {Promise<string>} Le mot saisi et validé.
 */
async function askForValidWord(playerIndex) {
  let word = await askQuestion(`Joueur ${playerIndex + 1}, propose un indice (1 mot valide) : `);
  let cleanedWord = word.trim();
  if (!isValidWord(cleanedWord)) {
    console.log("Indice invalide (il doit être composé de lettres et accents uniquement). Réessaie.");
    return await askForValidWord(playerIndex);
  }
  return cleanedWord;
}

/**
 * Gère la phase de comparaison des indices et la tentative de réponse du joueur actif.
 * @param {Array} proposals - Tableau des propositions {player, word}
 * @param {string} mysteryWord - Le mot mystère à deviner
 * @param {number} chosenIndex - L'indice choisi par le joueur actif (entre 1 et 5)
 * @param {Array} card - La carte complète (les 5 mots)
 */
async function handleProposalsAndGuess(proposals, mysteryWord, chosenIndex, card) {
  const THRESHOLD = 2;
  if (!mysteryWord) {
    console.error("Erreur : mysteryWord est indéfini !");
    return;
  }
  const normalizedMysteryWord = normalizeWord(mysteryWord);

  const normalizedWords = proposals.map(p => ({
    player: p.player,
    original: p.word,
    norm: normalizeWord(p.word)
  }));

  const invalidSet = new Set();

  // Vérification des indices identiques (doublons)
  const wordCounts = new Map();
  normalizedWords.forEach(p => {
    wordCounts.set(p.norm, (wordCounts.get(p.norm) || 0) + 1);
  });
  wordCounts.forEach((count, word) => {
    if (count > 1) {
      normalizedWords.forEach(p => {
        if (p.norm === word) {
          invalidSet.add(p.player);
          console.log(`❌ Joueur ${p.player + 1} → "${p.original}" est en double → ANNULÉ`);
        }
      });
    }
  });

  // Vérification des mots de la même famille que le mot mystère
  normalizedWords.forEach(p => {
    if (!invalidSet.has(p.player)) {
      if (isSameFamily(p.norm, normalizedMysteryWord)) {
        invalidSet.add(p.player);
        console.log(`❌ Joueur ${p.player + 1} → "${p.original}" appartient à la même famille que "${mysteryWord}" → ANNULÉ`);
      }
    }
  });

  // Vérification de la proximité (distance de Levenshtein)
  normalizedWords.forEach(p => {
    if (!invalidSet.has(p.player)) {
      const distance = levenshteinDistance(p.norm, normalizedMysteryWord);
      if (distance <= THRESHOLD && distance < Math.min(p.norm.length, normalizedMysteryWord.length) / 2) {
        invalidSet.add(p.player);
        console.log(`❌ Joueur ${p.player + 1} → "${p.original}" est trop proche du mot mystère "${mysteryWord}" → ANNULÉ`);
      }
      // Vérification si le mot contient directement ou de façon « fuzzy » le mot mystère
      if (p.norm.includes(normalizedMysteryWord) ||
          normalizedMysteryWord.includes(p.norm) ||
          containsFuzzy(p.norm, normalizedMysteryWord, 1)) {
        invalidSet.add(p.player);
        console.log(`❌ Joueur ${p.player + 1} → "${p.original}" contient le mot mystère "${mysteryWord}" → ANNULÉ`);
      }
    }
  });

  // Mise à jour des propositions (validité)
  proposals.forEach(p => {
    p.valid = !invalidSet.has(p.player);
  });

  // Affichage du récapitulatif des indices proposés
  console.log("\n--- Résumé des indices proposés ---");
  proposals.forEach(p => {
    const status = p.valid ? "VALIDE" : "ANNULÉ (doublon, trop proche ou contenant le mot mystère)";
    console.log(`Joueur ${p.player + 1} => "${p.word}" [${status}]`);
  });

  // Phase de devinette du joueur actif
  console.log(`\nJoueur ${currentActivePlayer + 1}, à toi de deviner le mot mystère !`);
  console.log(`(Tape 'p' pour passer, 'q' pour abandonner)`);
  let guess = await askQuestion("Propose un mot : ");
  guess = guess.trim();
  let result;
  if (guess.toLowerCase() === 'p' || guess.toLowerCase() === 'q') {
    console.log("Tu as choisi de passer. La carte est défaussée.");
    result = "pass";
  } else if (guess.toLowerCase() === mysteryWord.toLowerCase()) {
    console.log("Bravo ! Bonne réponse !");
    score++;
    playerScores[currentActivePlayer]++;
    result = "success";
  } else {
    console.log(`Raté ! La bonne réponse était "${mysteryWord}".`);
    console.log("On défausse cette carte et on jette aussi la carte suivante de la pioche.");
    result = "failure";
  }

  // Enregistrement du tour dans le journal de partie
  gameLog.push({
    roundNumber: currentCardIndex + 1,
    chosenCard: card,
    chosenWordIndex: chosenIndex,
    proposals: proposals,
    finalResult: result
  });
  await saveGameLog();

  // Mise à jour de l'index de carte :
  // En cas d'échec, on passe la carte suivante également.
  currentCardIndex += (result === "failure") ? 2 : 1;

  // Passage au joueur suivant
  currentActivePlayer = (currentActivePlayer + 1) % NUM_PLAYERS;
  await startRound();
}

/**
 * Vérifie si la chaîne "proposed" contient une sous-chaîne (de longueur égale à "mystery")
 * dont la distance de Levenshtein est inférieure ou égale à maxDistance.
 * @param {string} proposed - Le mot proposé (normalisé)
 * @param {string} mystery - Le mot mystère (normalisé)
 * @param {number} maxDistance - Distance maximale autorisée (ex. 1)
 * @returns {boolean} true si une sous-chaîne est trop proche du mot mystère
 */
function containsFuzzy(proposed, mystery, maxDistance = 1) {
  if (proposed.length < mystery.length) return false;
  for (let i = 0; i <= proposed.length - mystery.length; i++) {
    const substring = proposed.substring(i, i + mystery.length);
    if (levenshteinDistance(substring, mystery) <= maxDistance) {
      return true;
    }
  }
  return false;
}

/**
 * Fin de partie : affichage du score et classement.
 */
function endGame() {
  console.log("\n===== Fin de la partie ! =====");
  console.log(`Cartes totales jouées : ${currentCardIndex} (sur un max de 13).`);
  console.log(`Nombre de cartes réussies : ${score}`);
  
  console.log("\n🎉 Classement des joueurs 🎉");
  const classement = playerScores
    .map((score, index) => ({ joueur: index + 1, score }))
    .sort((a, b) => b.score - a.score);
  
  classement.forEach((entry, rank) => {
    console.log(`${rank + 1}. Joueur ${entry.joueur} - ${entry.score} points`);
  });
  
  console.log("\nMerci d'avoir joué à Just One (version console améliorée) !");
  rl.close();
}

/**
 * Sauvegarde asynchrone du journal de partie dans un fichier JSON.
 */
async function saveGameLog() {
  try {
    await fsPromises.writeFile('game_log.json', JSON.stringify(gameLog, null, 2), 'utf-8');
  } catch (err) {
    console.error("Erreur lors de la sauvegarde du log :", err);
  }
}

/**
 * Mélange un tableau en utilisant l'algorithme Fisher-Yates.
 * @param {Array} array - Le tableau à mélanger.
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Vérifie qu'un mot est "valide" : il doit être composé uniquement de lettres (avec accents) et d'apostrophes.
 * @param {string} word - Le mot à vérifier.
 * @returns {boolean} true si le mot est valide, false sinon.
 */
function isValidWord(word) {
  return /^[a-zA-ZÀ-ÖÙ-öù-ÿ'-]+$/.test(word) && word.trim().length > 0;
}

/**
 * Normalise un mot en le mettant en minuscule et en supprimant les accents.
 * @param {string} word - Le mot à normaliser.
 * @returns {string} Le mot normalisé.
 */
function normalizeWord(word) {
  if (!word || typeof word !== "string") return "";
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}

/**
 * Vérifie si deux mots appartiennent à la même famille (ex. "Prince" et "Princesse").
 * @param {string} word1 
 * @param {string} word2 
 * @returns {boolean} true si les mots sont considérés comme de la même famille.
 */
function isSameFamily(word1, word2) {
  if (!word1 || !word2) return false;
  const normalizedWord1 = normalizeWord(word1);
  const normalizedWord2 = normalizeWord(word2);
  return normalizedWord1.includes(normalizedWord2) || normalizedWord2.includes(normalizedWord1);
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes.
 * @param {string} a 
 * @param {string} b 
 * @returns {number} La distance de Levenshtein.
 */
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j],    // suppression
          matrix[i][j - 1],    // insertion
          matrix[i - 1][j - 1] // substitution
        ) + 1;
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Fonction principale qui initialise le log puis démarre la partie.
 */
async function main() {
  await loadGameLog();
  console.log("Bienvenue dans Just One (version texte améliorée, 5 joueurs).");
  await askQuestion("Appuyez sur Entrée pour commencer.");
  await startRound();
}

main();
