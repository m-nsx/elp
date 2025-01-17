package main

import (
	"fmt"
	"io"
	"net"
	"os"
	"strconv"
	"strings"
)

// -------------------------------------------------------
// MAIN : point d'entrée du programme client
// -------------------------------------------------------
func main() {
	// S'il n'y a pas d'arguments, on affiche l'usage
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "test":
		runTestMode()
	default:
		// Validation des arguments pour les commandes standards
		if len(os.Args) < 3 {
			fmt.Println("Erreur : arguments insuffisants.")
			printUsage()
			os.Exit(1)
		}

		imagePath := os.Args[1]
		algorithm := os.Args[2]
		params := os.Args[3:]

		// Vérification des paramètres spécifiques
		switch algorithm {
		case "gblur":
			if len(params) < 1 || len(params) > 2 {
				fmt.Println("Erreur : gblur nécessite 1 ou 2 paramètres.")
				fmt.Println("Usage : go run client.go <image.png> gblur <blurLevel> [threads]")
				os.Exit(1)
			}
			if _, err := strconv.Atoi(params[0]); err != nil {
				fmt.Println("Erreur : <blurLevel> doit être un entier.")
				os.Exit(1)
			}
			if len(params) == 2 {
				if _, err := strconv.Atoi(params[1]); err != nil {
					fmt.Println("Erreur : [threads] doit être un entier si spécifié.")
					os.Exit(1)
				}
			}

		case "downscale":
			if len(params) < 2 || len(params) > 3 {
				fmt.Println("Erreur : downscale nécessite 2 ou 3 paramètres.")
				fmt.Println("Usage : go run client.go <image.png> downscale <width> <height> [threads]")
				os.Exit(1)
			}
			if _, err := strconv.Atoi(params[0]); err != nil {
				fmt.Println("Erreur : <width> doit être un entier.")
				os.Exit(1)
			}
			if _, err := strconv.Atoi(params[1]); err != nil {
				fmt.Println("Erreur : <height> doit être un entier.")
				os.Exit(1)
			}
			if len(params) == 3 {
				if _, err := strconv.Atoi(params[2]); err != nil {
					fmt.Println("Erreur : [threads] doit être un entier si spécifié.")
					os.Exit(1)
				}
			}

		default:
			fmt.Printf("Erreur : Algorithme inconnu : %s\n", algorithm)
			printUsage()
			os.Exit(1)
		}

		// Si tout est correct, exécute le client
		RunClient(imagePath, algorithm, params)
	}
}

// -------------------------------------------------------
// Affiche un petit message d'aide
// -------------------------------------------------------
func printUsage() {
	fmt.Println("Usage :")
	fmt.Println("  go run client.go test")
	fmt.Println("    => Demande au serveur d'exécuter ses tests de performance")
	fmt.Println()
	fmt.Println("  go run client.go <image_path> <algorithm> [params...]")
	fmt.Println("    => Exemples :")
	fmt.Println("       go run client.go monimage.png gblur 3 4")
	fmt.Println("       go run client.go monimage.png downscale 300 200 2")
}

// -------------------------------------------------------
// runTestMode : envoie simplement "test" au serveur
// pour qu'il exécute ses tests localement
// -------------------------------------------------------
func runTestMode() {
	// Connexion au serveur
	conn, err := net.Dial("tcp", "127.0.0.1:8080")
	if err != nil {
		fmt.Println("Impossible de se connecter au serveur :", err)
		return
	}
	defer conn.Close()

	// On écrit la commande "test\n"
	conn.Write([]byte("test\n"))

	// Le serveur ne s'attend pas à recevoir d'image,
	// il va directement renvoyer les résultats en texte.

	// 1) Lire la taille du texte (première ligne)
	var size int64
	_, err = fmt.Fscanf(conn, "%d\n", &size)
	if err != nil {
		fmt.Println("Erreur de lecture de la taille du texte :", err)
		return
	}

	// 2) Lire exactement 'size' octets
	buffer := make([]byte, size)
	_, err = io.ReadFull(conn, buffer)
	if err != nil {
		fmt.Println("Erreur de lecture des résultats :", err)
		return
	}

	// 3) Afficher
	fmt.Println("=== RÉSULTATS DES TESTS DU SERVEUR ===")
	fmt.Println(string(buffer))
}

// -------------------------------------------------------
// RunClient : envoie l'image et les paramètres au serveur
// -------------------------------------------------------
func RunClient(imagePath, algorithm string, params []string) {
	conn, err := net.Dial("tcp", "127.0.0.1:8080")
	if err != nil {
		panic(err)
	}
	defer conn.Close()

	// Ouvrir l'image en local
	file, err := os.Open(imagePath)
	if err != nil {
		fmt.Println("Erreur d'ouverture du fichier :", err)
		return
	}
	defer file.Close()

	fileInfo, err := file.Stat()
	if err != nil {
		fmt.Println("Erreur de Stat sur le fichier :", err)
		return
	}

	// Concatène l'algo + params => ex: "gblur 5 8"
	line := fmt.Sprintf("%s %s\n", algorithm, strings.Join(params, " "))
	_, _ = conn.Write([]byte(line))

	// Envoi de la taille du fichier
	_, _ = conn.Write([]byte(fmt.Sprintf("%d\n", fileInfo.Size())))

	// Envoi du contenu du fichier
	io.Copy(conn, file)

	// Réception du fichier traité
	receiveFile(conn, "output_processed.png")
}

// -------------------------------------------------------
// receiveFile : lit la taille et enregistre l'image traitée
// -------------------------------------------------------
func receiveFile(conn net.Conn, outputPath string) {
	var size int64
	fmt.Fscanf(conn, "%d\n", &size)

	out, err := os.Create(outputPath)
	if err != nil {
		fmt.Println("Erreur de création du fichier :", err)
		return
	}
	defer out.Close()

	io.CopyN(out, conn, size)
	fmt.Printf("Fichier traité reçu : %s\n", outputPath)
}
