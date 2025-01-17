# ELP - Ecosystèmes / Eventail des langages de programmation

## GO - Traitement d'images

Ce projet implémente deux algorithmes pour le traitement d'images en Go :

1. **Algorithme de redimensionnement d'image (Downscale)**
2. **Algorithme de flou gaussien (Gaussian Blur)**

### Fonctionnalités

- **Serveur TCP** : Gère les demandes de traitement d'image.
- **Client TCP** : Envoie des images et des instructions de traitement au serveur.
- **Mode Test** : Permet d'exécuter des tests de performance directement sur le serveur.

---

## Prérequis

- **Go** : Assurez-vous que Go est installé sur votre système (version 1.19 ou ultérieure recommandée).
- **Image d'entrée** : Les fichiers doivent être au format PNG.
- Placez une image de test nommée `test_image.png` dans le répertoire du serveur pour le mode test.

---

## Structure du projet

- **`server.go`** : Contient le code du serveur TCP.
- **`client.go`** : Contient le code du client TCP.
- **`utils.go`** : Fournit les fonctions utilitaires pour le traitement des images (redimensionnement, flou, encodage/decodage PNG).

---

## Instructions d'exécution

### 1. Lancer le serveur

Pour exécuter le serveur :

```bash
cd <dossier_du_projet/server>
go run server.go utils.go
```

Le serveur écoute par défaut sur le port `8080`. Vous pouvez spécifier un autre port comme suit :

```bash
go run server.go utils.go 9090
```

Le serveur reste en écoute pour recevoir les commandes du client.

---

### 2. Lancer le client

#### Mode standard

Pour exécuter le client en mode standard (envoi d'image et traitement) :

```bash
cd <dossier_du_projet/client>
go run client.go <chemin_image> <algorithme> [paramètres]
```

##### Exemples de commandes valides :

- **Flou gaussien** :

```bash
go run client.go test_image.png gblur 5 4
```
- `gblur` : Algorithme de flou gaussien.
- `5` : Niveau de flou (blur level).
- `4` : Nombre de threads (optionnel).

- **Redimensionnement d'image** :

```bash
go run client.go test_image.png downscale 300 200 4
```
- `downscale` : Algorithme de redimensionnement.
- `300` : Largeur cible.
- `200` : Hauteur cible.
- `4` : Nombre de threads (optionnel).

L'image traitée sera enregistrée sous le nom `output_processed.png`.

#### Mode test

Pour exécuter les tests de performance directement sur le serveur :

```bash
go run client.go test
```

Le client envoie la commande `test` au serveur. Le serveur exécute des tests de performance locaux en utilisant l'image `test_image.png` et renvoie les résultats au client.

---

## Fonctionnement

### Commandes supportées

| Commande                 | Description                                                                                       |
|--------------------------|---------------------------------------------------------------------------------------------------|
| `test`                  | Exécute les tests de performance sur le serveur.                                               |
| `gblur <blurLevel> [threads]` | Applique un flou gaussien avec le niveau et les threads spécifiés (threads optionnel).           |
| `downscale <width> <height> [threads]` | Redimensionne l'image à la largeur et hauteur spécifiées (threads optionnel).               |

### Résultat des tests

Le mode test affiche les performances des algorithmes pour différents nombres de threads. Exemple de sortie (non complet) :

```
[SERVER TEST] Chargement de test_image.png OK.

--- Testing Gaussian Blur (in-memory) ---
Task: gblur, Threads:    1, Avg Time: 9.63231642 ms
Task: gblur, Threads:    2, Avg Time:  5.10678106 ms
Task: gblur, Threads:    4, Avg Time:  2.87887852 ms

--- Testing DownScale (in-memory) ---
Task: downscale, Threads:    1, Avg Time: 2.19516 ms
Task: downscale, Threads:    2, Avg Time:  1.09916 ms
Task: downscale, Threads:    4, Avg Time:  651.54 µs


```

---

## Notes importantes

1. **Format des fichiers** : Assurez-vous que les fichiers envoyés au serveur sont au format PNG.
2. **Mode test** : Le serveur utilise une image nommée `test_image.png` pour les tests. Placez cette image dans le répertoire du serveur avant d'exécuter le mode test.
3. **Gestion des erreurs** : Le client vérifie les arguments fournis avant d'envoyer la requête au serveur. En cas d'erreur (commande incomplète, paramètres invalides, etc.), un message clair est affiché.

---

## Auteurs

- **Titouan, Maxime, Rémi**