package main

import (
	"fmt"
	"image"
	"image/color"
	"image/png"
	"os"
	"strconv"
)

// =============================
//
//	MAIN
//
// =============================
func main() {

	if len(os.Args) < 2 {
		fmt.Println("Syntaxe : go run main.go <algorithm>")
		os.Exit(1)
	}

	prog := os.Args[1]

	var RImg *image.RGBA

	if prog == "gblur" {
		if len(os.Args) < 5 {
			fmt.Println("Syntaxe : go run main.go gblur <input image> <output path> <level>")
			os.Exit(1)
		}
		inputPath := os.Args[2]
		outputPath := os.Args[3]
		var1, _ := strconv.Atoi(os.Args[4])
		img, err := loadImage(inputPath)
		if err != nil {
			fmt.Printf("Erreur lors du chargement de l'image : %v\n", err)
			os.Exit(1)
		}
		RImg = blur(img, var1)
		saveAsPNG(RImg, outputPath)
	}
	if prog == "downscale" {
		if len(os.Args) < 6 {
			fmt.Println("Syntaxe : go run main.go downscale <input image> <output path> <twidth> <theight>")
			os.Exit(1)
		}
		inputPath := os.Args[2]
		outputPath := os.Args[3]
		var1, _ := strconv.Atoi(os.Args[4])
		var2, _ := strconv.Atoi(os.Args[5])
		img, err := loadImage(inputPath)
		if err != nil {
			fmt.Printf("Erreur lors du chargement de l'image : %v\n", err)
			os.Exit(1)
		}
		RImg = downscale(img, var1, var2)
		saveAsPNG(RImg, outputPath)
	}

}

// =============================
//
//	LECTURE / ÉCRITURE IMAGE
//
// =============================

// Charge une image depuis un chemin path donné en paramètre, renvoie un objet image et une erreur en cas d'échec
func loadImage(path string) (image.Image, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	img, err := png.Decode(f)
	if err != nil {
		return nil, err
	}
	return img, nil
}

func saveAsPNG(img image.Image, path string) error {
	// Crée un fichier de sortie
	out, err := os.Create(path)
	if err != nil {
		return err
	}
	defer out.Close()

	// Crée un encodeur PNG avec le niveau de compression "NoCompression"
	encoder := png.Encoder{
		CompressionLevel: png.DefaultCompression,
	}

	// Encode l'image sans compression
	err = encoder.Encode(out, img)
	if err != nil {
		return err
	}

	return nil
}

// =============================
//
// GBLUR
//
// =============================

func blur(img image.Image, blurLevel int) *image.RGBA {
	bounds := img.Bounds()
	w, h := bounds.Dx(), bounds.Dy()

	// Créer une nouvelle image RGBA pour la sortie
	blurredImg := image.NewRGBA(image.Rect(0, 0, w, h))

	// Parcourir tous les pixels de l'image, sauf les bords (en fonction du rayon de flou)
	for y := blurLevel; y < h-blurLevel; y++ {
		for x := blurLevel; x < w-blurLevel; x++ {

			var r, g, b, a uint32
			count := uint32(0)

			// Parcourir les pixels voisins
			for ky := -blurLevel; ky <= blurLevel; ky++ {
				for kx := -blurLevel; kx <= blurLevel; kx++ {
					// Exclure le pixel central (0, 0)
					if ky == 0 && kx == 0 {
						continue
					}

					nColor := img.At(x+kx, y+ky)

					// Conversion NRGBA RGBA
					if c, ok := nColor.(color.NRGBA); ok {
						r += uint32(c.R)
						g += uint32(c.G)
						b += uint32(c.B)
						a += uint32(c.A)
						count++
					} else {
						_, cr, cg, cb := nColor.RGBA()
						r += cr >> 8
						g += cg >> 8
						b += cb >> 8
						a += uint32(nColor.(color.RGBA).A)
						count++
					}
				}
			}

			// Moyennage des valeurs
			r /= count
			g /= count
			b /= count
			a /= count

			// Convertir les valeurs en uint8 et les mettre dans la nouvelle image
			newColor := color.RGBA{
				R: uint8(r),
				G: uint8(g),
				B: uint8(b),
				A: uint8(a),
			}
			blurredImg.Set(x, y, newColor)
		}
	}

	return blurredImg
}

// =============================
//
// DOWNSCALE
//
// =============================

func downscale(img image.Image, targetWidth, targetHeight int) *image.RGBA {
	bounds := img.Bounds()
	srcWidth, srcHeight := bounds.Dx(), bounds.Dy()

	// Calcul des facteurs d'échelle pour ajuster à la résolution cible
	scaleX := float64(srcWidth) / float64(targetWidth)
	scaleY := float64(srcHeight) / float64(targetHeight)

	// Créer une nouvelle image avec la résolution cible
	resizedImg := image.NewRGBA(image.Rect(0, 0, targetWidth, targetHeight))

	// Parcourir les pixels de l'image cible
	for y := 0; y < targetHeight; y++ {
		for x := 0; x < targetWidth; x++ {
			// Calculer les coordonnées dans l'image source
			srcX := int(float64(x) * scaleX)
			srcY := int(float64(y) * scaleY)

			// Récupérer la couleur du pixel correspondant dans l'image source
			srcColor := img.At(srcX, srcY)

			// Définir la couleur du pixel dans l'image redimensionnée
			resizedImg.Set(x, y, srcColor)
		}
	}

	return resizedImg
}
