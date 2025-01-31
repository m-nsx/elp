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
  // Ajoutez-en plus si besoin...
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
let currentCardIndex = 0;    // index de la carte en cours (0..12)
let currentActivePlayer = 0; // joueur actif (0..4)
let score = 0;               // nombre de cartes réussies

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
      rl.question(`Joueur ${playerIndex + 1}, propose un indice (1 mot valide) : `, (word) => {
        let cleanedWord = word.trim();

        // Validation : on n'accepte que des lettres (avec accents éventuels) + apostrophes éventuelles
        while (!isValidWord(cleanedWord)) {
          console.log("Indice invalide (ce doit être un mot : lettres et accents uniquement). Réessaie.");
          // On redemande
          return rl.question(`Joueur ${playerIndex + 1}, re-propose un mot valide : `, (retryWord) => {
            cleanedWord = retryWord.trim();
            if (!isValidWord(cleanedWord)) {
              console.log("Toujours invalide, on enregistre un indice vide.");
              cleanedWord = "";
            }
            proposals.push({ player: playerIndex, word: cleanedWord });
            nextProposal(playerIndex + 1);
          });
        }

        // Si c'est valide, on enregistre
        proposals.push({ player: playerIndex, word: cleanedWord });
        // Prochain
        nextProposal(playerIndex + 1);
      });
    }

    /**
     * Gère la comparaison des indices et la phase de devinette.
     */
    function handleProposalsAndGuess() {
      // Annulation des doublons (ou quasi-doublons)
      // 1) On normalise et on détecte les collisions via distance de Levenshtein
      // Seuil configuré ici (2 ou 3)
      const THRESHOLD = 2;

      const normalizedWords = proposals.map(p => ({
        player: p.player,
        original: p.word,
        norm: normalizeWord(p.word)
      }));

      // Détection de ceux qui se ressemblent trop
      // On va stocker un tableau de "groupes" : tout ce qui est similaire => doublon
      const invalidSet = new Set(); // contiendra les indices (playerIndex) invalidés

      for (let i = 0; i < normalizedWords.length; i++) {
        for (let j = i + 1; j < normalizedWords.length; j++) {
          const wordA = normalizedWords[i];
          const wordB = normalizedWords[j];

          // Si déjà invalidé, on skip
          if (invalidSet.has(wordA.player) || invalidSet.has(wordB.player)) {
            continue;
          }

          // Calcul de la distance
          const dist = levenshteinDistance(wordA.norm, wordB.norm);
          if (dist <= THRESHOLD && wordA.norm.length > 0 && wordB.norm.length > 0) {
            // => ce sont des "doublons" ou quasi-doublons => on invalide les 2
            invalidSet.add(wordA.player);
            invalidSet.add(wordB.player);
          }
        }
      }

      // On met à jour proposals avec valid = false si dans invalidSet
      proposals.forEach(p => {
        p.valid = !invalidSet.has(p.player);
      });

      // --- Affichage du récapitulatif ---
      console.log("\n--- Résumé des indices proposés ---");
      proposals.forEach(p => {
        const status = p.valid ? "VALIDE" : "ANNULÉ (doublon ou trop proche)";
        console.log(`Joueur ${p.player + 1} => "${p.word}" [${status}]`);
      });

      // Phase de devinette
      console.log(`\nJoueur ${currentActivePlayer + 1}, à toi de deviner le mot mystère !`);
      console.log(`(Tape 'p' pour passer, 'q' pour abandonner)`);
      rl.question("Propose un mot : ", (guess) => {
        guess = guess.trim();
        let result;
        if (guess.toLowerCase() === 'p') {
          // Passe
          console.log("Tu as choisi de passer. La carte est défaussée.");
          result = "pass";
        } else if (guess.toLowerCase() === 'q') {
          console.log("Abandon de la partie...");
          // On peut considérer un pass ou un échec, au choix
          result = "pass";
        } else if (guess.toLowerCase() === mysteryWord.toLowerCase()) {
          console.log("Bravo ! Bonne réponse !");
          score++;
          result = "success";
        } else {
          console.log(`Raté ! La bonne réponse était "${mysteryWord}".`);
          console.log("On défausse cette carte et on jette aussi la carte suivante de la pioche.");
          result = "failure";
        }

        // On enregistre dans le log
        gameLog.push({
          roundNumber,
          chosenCard: card,
          chosenWordIndex: chosenIndex,
          proposals: proposals,
          finalResult: result
        });
        saveGameLog();

        // Si échec => on saute la carte suivante
        if (result === "failure") {
          currentCardIndex += 2;
        } else {
          currentCardIndex += 1;
        }

        // On passe la main au joueur suivant
        currentActivePlayer = (currentActivePlayer + 1) % NUM_PLAYERS;
        // Tour suivant
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
  if (score === 13) {
    console.log("Score parfait ! Félicitations !");
  } else if (score >= 11) {
    console.log("Génial !");
  } else if (score >= 9) {
    console.log("Waouh, pas mal du tout !");
  } else if (score >= 7) {
    console.log("Dans la moyenne, réessayez pour faire mieux !");
  } else if (score >= 4) {
    console.log("C’est un bon début. Réessayez !");
  } else {
    console.log("Essayez encore...");
  }

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
  return word
    .toLowerCase()
    .normalize("NFD")               // décompose les accents
    .replace(/[\u0300-\u036f]/g, "") // supprime les diacritiques
    .replace(/[^a-z]/g, "");         // supprime tout ce qui n'est pas lettre (ex: apostrophe)
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
