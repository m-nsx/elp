# 🎢 Just One - Jeu en mode texte (Node.js)

Just One est un jeu de devinettes coopératif où les joueurs doivent faire deviner un mot mystère à un joueur actif.  
Cette version console permet de jouer à **5 joueurs** en se partageant un clavier.

## 🌜 Règles du jeu

1. Le joueur actif choisit un **mot mystère** parmi une liste de 5 mots.
2. Les **autres joueurs** proposent un **indice** (un mot uniquement).
3. Les **indices identiques trop proches ou contenant (même de façon approximative)** sont **annulés**.
4. Le joueur actif **tente de deviner** le mot mystère.
5. La partie continue jusqu'à **13 cartes jouées**, avec un **score final**.

## 🚀 Installation et exécution

### 1️⃣ Prérequis

- **Node.js** (version 16+ recommandée)  
  🔗 [Télécharger Node.js](https://nodejs.org/)
- **Git** (optionnel pour cloner le dépôt)

### 2️⃣ Cloner et installer le projet

Si vous utilisez **Git** :
```bash
git clone https://github.com/votre-compte/just-one-node.git
cd just-one-node
```

Sinon, téléchargez le projet et placez-vous dans le dossier.

### 3️⃣ Lancer le jeu

Dans le terminal :

```bash
npm start
```

ou directement :

```bash
node index.js
```

---

## 🎮 Fonctionnement du jeu

### 🔶 Déroulement d'un tour

1. Le **joueur actif** choisit un **mot mystère** parmi une carte contenant **5 mots**.
2. Les **autres joueurs** écrivent chacun **un indice** (mot unique).
3. Les **indices invalides ou trop proches** sont annulés automatiquement.
4. Le **joueur actif tente de deviner** avec les indices restants.
5. **Score mis à jour** après chaque tour.

Le jeu affiche un **résumé du tour** et continue jusqu'à épuisement des 13 cartes.

---

## 📺 Format du fichier de log (`game_log.json`)

Chaque partie est enregistrée dans un fichier `game_log.json`.  
Chaque manche est sauvegardée sous forme d'un objet JSON comme ceci :

```json
{
  "roundNumber": 1,
  "chosenCard": ["Orange", "Pyramide", "Hôpital", "Guitare", "Robot"],
  "chosenWordIndex": 3,
  "proposals": [
    { "player": 1, "word": "Clinique", "valid": true },
    { "player": 2, "word": "Hôpital", "valid": false },
    { "player": 3, "word": "Docteur", "valid": true }
  ],
  "finalResult": "success"
}
```

Explication des champs :
- **`roundNumber`** : Numéro du tour joué.
- **`chosenCard`** : Liste des 5 mots de la carte en jeu.
- **`chosenWordIndex`** : Numéro du mot sélectionné par le joueur actif.
- **`proposals`** : Liste des indices proposés par les joueurs :
  - `player` : Numéro du joueur (1 à 5)
  - `word` : Indice proposé
  - `valid` : `true` si accepté, `false` si annulé
- **`finalResult`** :
  - `"success"` → Bonne réponse 🎉
  - `"failure"` → Mauvaise réponse ❌
  - `"pass"` → Le joueur a passé son tour ⏭️

---

## 🎯 Score et évaluation finale

| Score | Résultat |
|-------|---------|
| **13** | ⭐ Score parfait ! Félicitations ! |
| **11-12** | 🔥 Génial ! Super performance ! |
| **9-10** | 💪 Très bon score, continuez comme ça ! |
| **7-8** | 📊 Score moyen, vous pouvez faire mieux ! |
| **4-6** | 🎓 Bon début, retentez votre chance ! |
| **0-3** | ❌ Mauvais score, entraînez-vous ! |

