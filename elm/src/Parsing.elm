module Parsing exposing (Instruction(..), read)

import Parser exposing (..)

type Instruction
    = Forward Int
    | Left Int
    | Right Int
    | Repeat Int (List Instruction)

read : String -> Result String (List Instruction)
read input =
    run programParser input
        |> Result.mapError (\_ -> "Erreur de syntaxe")

programParser : Parser (List Instruction)
programParser =
    symbol "["
        |> andThen (\_ -> instructionsParser)
        |> andThen
            (\is ->
                spaces
                    |> andThen (\_ -> symbol "]")
                    |> andThen (\_ -> succeed is)
            )

instructionsParser : Parser (List Instruction)
instructionsParser =
    loop [] instructionsHelp

instructionsHelp : List Instruction -> Parser (Step (List Instruction) (List Instruction))
instructionsHelp revInstructions =
    oneOf
        [ succeed (\i -> Loop (i :: revInstructions))
            |= instructionParser
            |. spaces
            |. optionalComma
        , succeed ()
            |> map (\_ -> Done (List.reverse revInstructions))
        ]

optionalComma : Parser ()
optionalComma =
    oneOf
        [ symbol "," |. spaces
        , succeed ()
        ]

instructionParser : Parser Instruction
instructionParser =
    spaces
        |> andThen
            (\_ ->
                oneOf
                    [ repeatParser
                    , forwardParser
                    , leftParser
                    , rightParser
                    ]
            )

repeatParser : Parser Instruction
repeatParser =
    succeed Repeat
        |. keyword "Repeat"
        |. spaces
        |= int
        |. spaces
        |= lazy (\_ -> programParser)

forwardParser : Parser Instruction
forwardParser =
    succeed Forward
        |. keyword "Forward"
        |. spaces
        |= int

leftParser : Parser Instruction
leftParser =
    succeed Left
        |. keyword "Left"
        |. spaces
        |= int

rightParser : Parser Instruction
rightParser =
    succeed Right
        |. keyword "Right"
        |. spaces
        |= int

keyword : String -> Parser ()
keyword str =
    token str |. spaces

symbol : String -> Parser ()
symbol str =
    token str |. spaces
