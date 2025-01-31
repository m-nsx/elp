module Drawing exposing (display)

import Parsing exposing (Instruction(..))
import Svg exposing (..)
import Svg.Attributes exposing (..)


type alias Point = { x : Float, y : Float }
type alias Line = { start : Point, end : Point }

display : Bool -> List Instruction -> Svg msg
display autoZoom instructions =
    let
        initialState = { x = 0, y = 0, angle = 0, lines = [] }
        finalState = process instructions initialState
        viewBoxStr = 
            if autoZoom then
                calculateViewBox finalState.lines
            else
                "-200 -200 400 400"
    in
    svg
        [ viewBox viewBoxStr  -- ← Ici on utilise la valeur calculée !
        , width "400"
        , height "400"
        , preserveAspectRatio "xMidYMid meet"  -- Ajout important pour le centrage
        ]
        (List.map drawLine finalState.lines)

calculateViewBox : List Line -> String
calculateViewBox lines =
    let
        allPoints = 
            List.concatMap (\line -> [line.start, line.end]) lines

        xs = List.map .x allPoints
        ys = List.map .y allPoints

        minX = Maybe.withDefault 0 (List.minimum xs)
        maxX = Maybe.withDefault 0 (List.maximum xs)
        minY = Maybe.withDefault 0 (List.minimum ys)
        maxY = Maybe.withDefault 0 (List.maximum ys)

        padding = 20
        width = (maxX - minX) |> Basics.max 1 |> (+) (2 * padding)
        height = (maxY - minY) |> Basics.max 1 |> (+) (2 * padding)
    in
    String.join " "
        [ String.fromFloat (minX - padding)
        , String.fromFloat (minY - padding)
        , String.fromFloat width
        , String.fromFloat height
        ]

drawLine : Line -> Svg msg
drawLine { start, end } =
    line
        [ x1 (String.fromFloat start.x)
        , y1 (String.fromFloat start.y)
        , x2 (String.fromFloat end.x)
        , y2 (String.fromFloat end.y)
        , stroke "black"
        ]
        []

type alias Turtle =
    { x : Float
    , y : Float
    , angle : Float
    , lines : List Line
    }

process : List Instruction -> Turtle -> Turtle
process instructions turtle =
    List.foldl processInstruction turtle instructions

processInstruction : Instruction -> Turtle -> Turtle
processInstruction instruction turtle =
    case instruction of
        Forward n ->
            let
                rad = degrees turtle.angle
                dx = toFloat n * cos rad
                dy = toFloat n * sin rad
                newPos = { x = turtle.x + dx, y = turtle.y - dy }
                newLine = { start = { x = turtle.x, y = turtle.y }, end = newPos }
            in
            { turtle | x = newPos.x, y = newPos.y, lines = newLine :: turtle.lines }

        Left deg ->
            { turtle | angle = turtle.angle + toFloat deg }

        Right deg ->
            { turtle | angle = turtle.angle - toFloat deg }

        Repeat n list ->
            List.repeat n list
                |> List.concat
                |> (\cmds -> process cmds turtle)