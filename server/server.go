package main

import (
	"bufio"
	"bytes"
	"fmt"
	"image"
	"io"
	"net"
	"os"
	"strconv"
	"strings"
)

// --------------------------------------------------------------
// MAIN : point d'entrée du programme serveur
// --------------------------------------------------------------
func main() {
	port := "8080"
	if len(os.Args) > 1 {
		port = os.Args[1]
	}
	fmt.Printf("Démarrage du serveur sur le port %s...\n", port)

	StartServer(port)
}

// --------------------------------------------------------------
// StartServer : lance l'écoute sur le port spécifié
// --------------------------------------------------------------
func StartServer(port string) {
	ln, err := net.Listen("tcp", ":"+port)
	if err != nil {
		panic(err)
	}
	defer ln.Close()

	fmt.Printf("Serveur en écoute sur le port %s...\n", port)

	// Boucle d'acceptation des connexions
	for {
		conn, err := ln.Accept()
		if err != nil {
			fmt.Println("Erreur d'acceptation de connexion :", err)
			continue
		}
		fmt.Println("Nouveau client connecté :", conn.RemoteAddr())

		// handleClient gère chaque client dans une goroutine
		go handleClient(conn)
	}
}

// --------------------------------------------------------------
// handleClient : gère la communication avec un client
// --------------------------------------------------------------
func handleClient(conn net.Conn) {
	defer conn.Close()

	reader := bufio.NewReader(conn)

	// 1) Lire la ligne de paramètres (ex: "gblur 3", "downscale 300 200", "test", etc.)
	paramsLine, err := reader.ReadString('\n')
	if err != nil {
		fmt.Println("Erreur de lecture de la commande :", err)
		return
	}
	paramsLine = strings.TrimSpace(paramsLine)
	parts := strings.Split(paramsLine, " ")
	if len(parts) < 1 {
		fmt.Println("Paramètres invalides reçus :", paramsLine)
		return
	}
	algorithm := parts[0]

	// Cas particulier : si l'utilisateur demande "test",
	// on ne s'attend PAS à recevoir d'image. On effectue les tests localement et on envoie les résultats.
	if algorithm == "test" {
		fmt.Println("Commande 'test' reçue. Exécution des tests de performance côté serveur...")
		results := runPerformanceTestsServer()
		// Envoi du résultat au client (sous forme de texte)
		sendTextResult(conn, results)
		fmt.Println("Tests terminés. Résultats envoyés au client.")
		return
	}

	// Sinon, on continue comme avant : gblur, downscale, etc.
	// 2) Lire la taille du fichier image envoyée
	sizeStr, err := reader.ReadString('\n')
	if err != nil {
		fmt.Println("Erreur de lecture de la taille du fichier :", err)
		return
	}
	sizeStr = strings.TrimSpace(sizeStr)
	fileSize, err := strconv.Atoi(sizeStr)
	if err != nil {
		fmt.Println("Erreur de conversion de la taille :", err)
		return
	}

	// 3) Lire entièrement les data de l'image
	imgData := make([]byte, fileSize)
	_, err = io.ReadFull(reader, imgData)
	if err != nil {
		fmt.Println("Erreur de réception de l'image :", err)
		return
	}

	// 4) Décoder l'image en mémoire
	img, err := DecodePNGFromBytes(imgData)
	if err != nil {
		fmt.Println("Erreur lors du décodage de l'image :", err)
		return
	}

	// 5) Selon l'algorithme, traiter l'image
	var processedImg image.Image

	switch algorithm {
	case "gblur":
		// On s'attend à blurLevel (parts[1]) et éventuellement threads (parts[2])
		if len(parts) < 2 {
			fmt.Println("Paramètres insuffisants pour gblur")
			return
		}
		level, _ := strconv.Atoi(parts[1])

		threads := 1
		if len(parts) >= 3 {
			t, err := strconv.Atoi(parts[2])
			if err == nil && t > 0 {
				threads = t
			}
		}
		processedImg = Blur(img, level, threads)

	case "downscale":
		// On s'attend à width (parts[1]) et height (parts[2]), éventuellement threads (parts[3])
		if len(parts) < 3 {
			fmt.Println("Paramètres insuffisants pour downscale")
			return
		}
		width, _ := strconv.Atoi(parts[1])
		height, _ := strconv.Atoi(parts[2])

		threads := 1
		if len(parts) >= 4 {
			t, err := strconv.Atoi(parts[3])
			if err == nil && t > 0 {
				threads = t
			}
		}
		processedImg = Downscale(img, width, height, threads)

	default:
		fmt.Println("Algorithme inconnu :", algorithm)
		return
	}

	// 6) Encoder l'image traitée en PNG
	encodedBytes, err := EncodePNGToBytes(processedImg)
	if err != nil {
		fmt.Println("Erreur lors de l'encodage de l'image :", err)
		return
	}

	// 7) Envoyer la taille
	_, err = conn.Write([]byte(fmt.Sprintf("%d\n", len(encodedBytes))))
	if err != nil {
		fmt.Println("Erreur d’envoi de la taille :", err)
		return
	}

	// 8) Envoyer le contenu
	_, err = conn.Write(encodedBytes)
	if err != nil {
		fmt.Println("Erreur d’envoi de l'image traitée :", err)
		return
	}

	fmt.Println("Image traitée envoyée avec succès.")
}

// --------------------------------------------------------------
// runPerformanceTestsServer : exécute les tests "en mémoire"
// côté serveur et renvoie un string contenant les résultats.
// --------------------------------------------------------------
func runPerformanceTestsServer() string {
	// Ici, on peut charger une image "serveur" (ex : "test_image.png"),
	// puis faire une boucle sur différents threads, blurLevels, etc.
	// Pour simplifier, on va juste illustrer avec un pseudo test.

	testImagePath := "test_image.png"
	img, err := LoadImage(testImagePath)
	if err != nil {
		return fmt.Sprintf("Erreur lors du chargement de %s : %v\n", testImagePath, err)
	}

	var buffer bytes.Buffer

	buffer.WriteString(fmt.Sprintf("[SERVER TEST] Chargement de %s OK.\n", testImagePath))

	threadsList := []int{1, 2, 4, 8, 16, 32, 64}
	repetitions := 3 // ex. 3 répétitions

	buffer.WriteString("\n--- Testing Gaussian Blur (in-memory) ---\n")
	testPerformanceServer(&buffer, "gblur", img, threadsList, repetitions, 3)

	buffer.WriteString("\n--- Testing DownScale (in-memory) ---\n")
	testPerformanceServer(&buffer, "downscale", img, threadsList, repetitions, 256, 256)

	return buffer.String()
}

// --------------------------------------------------------------
// testPerformanceServer : effectue un test en mémoire
// sur blur / downscale pour différents threads
// --------------------------------------------------------------
func testPerformanceServer(buf *bytes.Buffer, task string, img image.Image, threadsList []int, repetitions int, params ...int) {
	var blurLevelOrWidth, heightOrUnused int
	if len(params) > 0 {
		blurLevelOrWidth = params[0]
	}
	if len(params) > 1 {
		heightOrUnused = params[1]
	}

	for _, threads := range threadsList {
		var totalTime int64 // on stocke en nanosecondes
		for i := 0; i < repetitions; i++ {
			start := NowNano()

			switch task {
			case "gblur":
				_ = Blur(img, blurLevelOrWidth, threads)
			case "downscale":
				_ = Downscale(img, blurLevelOrWidth, heightOrUnused, threads)
			}

			elapsed := NowNano() - start
			totalTime += elapsed
		}
		avgTime := float64(totalTime) / float64(repetitions) / 1e6 // en millisecondes
		buf.WriteString(fmt.Sprintf("Task: %s, Threads: %4d, Avg Time: %.3f ms\n", task, threads, avgTime))
	}
}

// --------------------------------------------------------------
// sendTextResult : envoie un texte brut au client
// de la même manière qu'on envoie une image (taille + contenu)
// --------------------------------------------------------------
func sendTextResult(conn net.Conn, text string) {
	// On écrit la taille du texte (en octets)
	conn.Write([]byte(fmt.Sprintf("%d\n", len(text))))
	// On écrit le texte lui-même
	conn.Write([]byte(text))
	fmt.Println("Résultats de test envoyés.")
}
