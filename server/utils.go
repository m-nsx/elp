package main

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"os"
	"sync"
	"time"
)

// ----------------------------------------
// Fonctions de chargement d'image, etc.
// ----------------------------------------
func LoadImage(path string) (image.Image, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return png.Decode(f)
}

func DecodePNGFromBytes(data []byte) (image.Image, error) {
	return png.Decode(bytes.NewReader(data))
}

func EncodePNGToBytes(img image.Image) ([]byte, error) {
	var buf bytes.Buffer
	err := png.Encode(&buf, img)
	return buf.Bytes(), err
}

// ----------------------------------------
// BLUR
// ----------------------------------------
func Blur(img image.Image, blurLevel, threads int) *image.RGBA {
	bounds := img.Bounds()
	width, height := bounds.Dx(), bounds.Dy()

	blurredImg := image.NewRGBA(image.Rect(0, 0, width, height))

	var wg sync.WaitGroup
	sem := make(chan struct{}, threads)

	for y := 0; y < height; y++ {
		wg.Add(1)
		sem <- struct{}{}
		go func(y int) {
			defer wg.Done()
			defer func() { <-sem }()

			for x := 0; x < width; x++ {
				var r, g, b, a uint32
				var count uint32

				for ky := -blurLevel; ky <= blurLevel; ky++ {
					for kx := -blurLevel; kx <= blurLevel; kx++ {
						nx := x + kx
						ny := y + ky
						if nx >= 0 && nx < width && ny >= 0 && ny < height {
							rr, gg, bb, aa := img.At(nx, ny).RGBA()
							r += rr >> 8
							g += gg >> 8
							b += bb >> 8
							a += aa >> 8
							count++
						}
					}
				}

				r /= count
				g /= count
				b /= count
				a /= count
				blurredImg.Set(x, y, color.RGBA{uint8(r), uint8(g), uint8(b), uint8(a)})
			}
		}(y)
	}
	wg.Wait()
	return blurredImg
}

// ----------------------------------------
// DOWNSCALE
// ----------------------------------------
func Downscale(img image.Image, targetWidth, targetHeight, threads int) *image.RGBA {
	bounds := img.Bounds()
	srcWidth, srcHeight := bounds.Dx(), bounds.Dy()

	scaleX := float64(srcWidth) / float64(targetWidth)
	scaleY := float64(srcHeight) / float64(targetHeight)

	downsizedImg := image.NewRGBA(image.Rect(0, 0, targetWidth, targetHeight))

	var wg sync.WaitGroup
	sem := make(chan struct{}, threads)

	for y := 0; y < targetHeight; y++ {
		wg.Add(1)
		sem <- struct{}{}
		go func(y int) {
			defer wg.Done()
			defer func() { <-sem }()

			for x := 0; x < targetWidth; x++ {
				srcX := int(float64(x) * scaleX)
				srcY := int(float64(y) * scaleY)
				downsizedImg.Set(x, y, img.At(srcX, srcY))
			}
		}(y)
	}
	wg.Wait()
	return downsizedImg
}

// ----------------------------------------
// Helpers divers
// ----------------------------------------

// NowNano : renvoie l'heure courante en nanosecondes
func NowNano() int64 {
	return time.Now().UnixNano()
}
