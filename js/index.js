/**
 * Just One - Jeu textuel amélioré pour Node.js
 * Auteurs : Sawlyer, mnsx, Tortouille
 */

const fs = require('fs');
const readline = require('readline');

/**
 * Pour la saisie en console.
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Pseudo-base de cartes : pour la démonstration, chaque carte a 5 mots.
 * On en sélectionnera 13 en mélangeant.
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
  ["Tomate", "Pont", "Verre", "Route", "Balai"],
  ["Jeu", "Image", "Cylindre", "Lampe", "Magasin"],
  ["Champs", "Voiture", "Peinture", "Maths", "Idée"]
];

// On mélange puis on prend 13 cartes maxi
shuffleArray(CARDS);
const SELECTED_CARDS = CARDS.slice(0, 13);

/**
 * Nombre de joueurs (on reste sur 5, mais vous pouvez adapter).
 */
const NUM_PLAYERS = 5;

/**
 * Journal de partie : on stockera un objet par tour joué.
 */
let gameLog = [];

// Tentative de chargement du fichier de log existant
try {
  const existingLog = fs.readFileSync('game_log.json', 'utf-8');
  gameLog = JSON.parse(existingLog);
} catch (err) {
  gameLog = [];
}

/**
 * Variables globales pour la partie
 */
let currentCardIndex = SELECTED_CARDS.length - 5;    // index de la carte en cours (0..12) 0 
let currentActivePlayer = 0; // joueur actif (0..4)
let score = 0;               // nombre de cartes réussies
let playerScores = Array(NUM_PLAYERS).fill(0);

/**
 * Lancement du jeu
 */
console.log("Bienvenue dans Just One (version texte améliorée, 5 joueurs).");
console.log("Appuyez sur Entrée pour commencer.");
rl.question('', () => {
  startRound();
});

/**
 * Fonction principale pour jouer un tour.
 */
function startRound() {
  // Vérifie s'il reste des cartes
  if (currentCardIndex >= SELECTED_CARDS.length) {
    endGame();
    return;
  }

  const roundNumber = currentCardIndex + 1;
  console.log(`\n===== Tour n°${roundNumber} =====`);
  console.log(`(Score actuel : ${score} réussite(s) sur ${currentCardIndex} carte(s) jouée(s))`);
  console.log(`C'est au tour du Joueur ${currentActivePlayer + 1} d'être le joueur actif.`);

  // Afficher les 5 mots de la carte
  const card = SELECTED_CARDS[currentCardIndex];
  console.log("Les 5 mots de la carte sont :");
  card.forEach((word, idx) => {
    console.log(`  ${idx + 1}. ${word}`);
  });

  // Demander au joueur actif de choisir un nombre 1..5
  rl.question(`Joueur ${currentActivePlayer + 1}, choisis un nombre entre 1 et 5 : `, (input) => {
    let chosenIndex = parseInt(input, 10);
    if (isNaN(chosenIndex) || chosenIndex < 1 || chosenIndex > 5) {
      console.log("Entrée invalide, on prend 1 par défaut.");
      chosenIndex = 1;
    }
    const mysteryWord = card[chosenIndex - 1];
    console.log(`Le mot mystère à deviner est le ${chosenIndex}e mot : (caché pour le joueur actif, mais c'est "${mysteryWord}")`);

    // Recueillir les indices des autres joueurs
    const proposals = [];
    nextProposal(0);

    function nextProposal(playerIndex) {
      // Si on a dépassé le nombre de joueurs, on passe à la phase de comparaison
      if (playerIndex >= NUM_PLAYERS) {
        handleProposalsAndGuess();
        return;
      }

      // Si c'est le joueur actif, on skip
      if (playerIndex === currentActivePlayer) {
        nextProposal(playerIndex + 1);
        return;
      }

      // Sinon, on demande un indice
      askForValidWord(playerIndex, (validWord) => {
        proposals.push({ player: playerIndex, word: validWord });
        nextProposal(playerIndex + 1);
      });
    }


    /**
     * Fonction générique pour demander un mot valide à un joueur.
     * @param {number} playerIndex - Index du joueur (de 0 à NUM_PLAYERS - 1)
     * @param {function} callback - Fonction à exécuter une fois le mot validé
     */
    function askForValidWord(playerIndex, callback) {
      rl.question(`Joueur ${playerIndex + 1}, propose un indice (1 mot valide) : `, (word) => {
          let cleanedWord = word.trim();

          if (!isValidWord(cleanedWord)) {
              console.log("Indice invalide (ce doit être un mot : lettres et accents uniquement). Réessaie.");
              return askForValidWord(playerIndex, callback); // Relance la saisie si invalide
          }

          callback(cleanedWord); // Appelle la fonction de rappel avec le mot validé
      });
    }

    /**
     * Vérifie si un mot est de la même famille qu'un autre.
     * Exemple : "Prince" et "Princesse" sont considérés comme identiques.
     */
    function isSameFamily(word1, word2) {
      if (!word1 || !word2) return false;
    
      const normalizedWord1 = normalizeWord(word1);
      const normalizedWord2 = normalizeWord(word2);
    
      return normalizedWord1.includes(normalizedWord2) || normalizedWord2.includes(normalizedWord1);
    }

    /**
     * Gère la comparaison des indices et la phase de devinette.
     */
    function handleProposalsAndGuess() {
      const THRESHOLD = 2; // Seuil de similarité


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
  
      const invalidSet = new Set(); // Joueurs dont l'indice est annulé
  
      // Vérification des mots identiques
      const wordCounts = new Map();
      normalizedWords.forEach(p => {
          if (!invalidSet.has(p.player)) {
              wordCounts.set(p.norm, (wordCounts.get(p.norm) || 0) + 1);
          }
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
  
      // Vérification des mots de la même famille
      proposals.forEach(p => {
          if (!invalidSet.has(p.player)) { 
              if (isSameFamily(p.norm, normalizedMysteryWord)) {
                  invalidSet.add(p.player);
                  console.log(`❌ Joueur ${p.player + 1} → "${p.original}" appartient à la même famille que "${mysteryWord}" → ANNULÉ`);
              }
          }
      });
  
      // Comparaison avec le mot mystère
      normalizedWords.forEach(p => {
        if (!invalidSet.has(p.player)) { 
            const distance = levenshteinDistance(p.norm, normalizedMysteryWord);
            
            // Vérifie si la distance est proportionnelle à la longueur du mot
            if (distance <= THRESHOLD && distance < Math.min(p.norm.length, normalizedMysteryWord.length) / 2) {
                invalidSet.add(p.player);
                console.log(`❌ Joueur ${p.player + 1} → "${p.original}" est trop proche du mot mystère "${mysteryWord}" → ANNULÉ`);
            }
            
            // Vérifie si le mot contient directement le mot mystère
            if (p.norm.includes(normalizedMysteryWord) || normalizedMysteryWord.includes(p.norm)) {
                invalidSet.add(p.player);
                console.log(`❌ Joueur ${p.player + 1} → "${p.original}" contient le mot mystère "${mysteryWord}" → ANNULÉ`);
            }
        }
      });
  
      // Mise à jour des propositions
      proposals.forEach(p => {
          p.valid = !invalidSet.has(p.player);
      });
  
      // --- Affichage du récapitulatif ---
      console.log("\n--- Résumé des indices proposés ---");
      proposals.forEach(p => {
          const status = p.valid ? "VALIDE" : "ANNULÉ (doublon ou trop proche du mot mystère)";
          console.log(`Joueur ${p.player + 1} => "${p.word}" [${status}]`);
      });
  
      // Phase de devinette
      console.log(`\nJoueur ${currentActivePlayer + 1}, à toi de deviner le mot mystère !`);
      console.log(`(Tape 'p' pour passer, 'q' pour abandonner)`);
      rl.question("Propose un mot : ", (guess) => {
          guess = guess.trim();
          let result;
          if (guess.toLowerCase() === 'p') {
              console.log("Tu as choisi de passer. La carte est défaussée.");
              result = "pass";
          } else if (guess.toLowerCase() === 'q') {
              console.log("Abandon de la partie...");
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
  
          // On enregistre dans le log
          gameLog.push({
              roundNumber: currentCardIndex + 1,
              chosenCard: SELECTED_CARDS[currentCardIndex],
              chosenWordIndex: chosenIndex,
              proposals: proposals,
              finalResult: result
          });
          saveGameLog();
  
          // Si échec => on saute la carte suivante
          currentCardIndex += (result === "failure") ? 2 : 1;
  
          // On passe la main au joueur suivant
          currentActivePlayer = (currentActivePlayer + 1) % NUM_PLAYERS;
          startRound();
      });
    }
  
  
  });
}

/**
 * Fin de partie
 */
function endGame() {
  console.log("\n===== Fin de la partie ! =====");
  console.log(`Cartes totales jouées : ${currentCardIndex} (sur un max de 13).`);
  console.log(`Nombre de cartes réussies : ${score}`);
  
  // Petit tableau de score
  console.log("\n🎉 Classement des joueurs 🎉");
  const classement = playerScores
      .map((score, index) => ({ joueur: index + 1, score })) // Associe chaque joueur à son score
      .sort((a, b) => b.score - a.score); // Trie du meilleur au moins bon

  classement.forEach((entry, rank) => {
      console.log(`${rank + 1}. Joueur ${entry.joueur} - ${entry.score} points`);
  });

  console.log("\nMerci d'avoir joué à Just One (version console améliorée) !");
  rl.close();
}

/**
 * Sauvegarde du log
 */
function saveGameLog() {
  fs.writeFileSync('game_log.json', JSON.stringify(gameLog, null, 2), 'utf-8');
}

/**
 * Mélange un tableau (Fisher-Yates)
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Vérifie qu'un mot est "valide" : lettres + accents
 * (On peut autoriser l'apostrophe, tiret... selon vos besoins)
 */
function isValidWord(word) {
  // Autorise lettres (A-Z, a-z), éventuellement accents latins
  // On autorise également l'apostrophe
  return /^[a-zA-ZÀ-ÖÙ-öù-ÿ'-]+$/.test(word) && word.trim().length > 0;
}

/**
 * Normalise un mot : minuscule, supprime accents
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
 * Calcule la distance de Levenshtein entre deux chaînes
 * (version simple, vous pouvez utiliser un package NPM "fast-levenshtein" ou "natural")
 */
function levenshteinDistance(a, b) {
  // Si l'une est vide, la distance = longueur de l'autre
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Création matrice
  const matrix = [];

  // Initialisation
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Remplissage
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
