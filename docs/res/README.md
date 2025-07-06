# README.md

## Creating icon with an alphabet:

```
convert -size 128x128 xc:transparent -fill "#005700" -font "DejaVu-Sans" -pointsize 90 -gravity center -draw "text 0,0 'A'" a.png
```