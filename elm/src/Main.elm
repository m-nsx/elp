module Main exposing (..)

import Browser
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Parsing exposing (Instruction)
import Drawing exposing (display)
import Process
import Time
import Task


type alias Model =
    { input : String
    , drawing : Result String (List Instruction)
    , autoZoom : Bool
    , processingTime : Maybe Float 
    }

type Msg
    = UpdateInput String
    | Draw
    | MeasureStart Time.Posix 
    | MeasureEnd Time.Posix Time.Posix
    | ToggleZoom

main : Program () Model Msg
main =
    Browser.element
        { init = init
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }

init : () -> (Model, Cmd Msg)
init _ =
    ( { input = ""
      , drawing = Err "Entrez un programme"
      , autoZoom = True
      , processingTime = Nothing
      }
    , Cmd.none
    )

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
    case msg of
        UpdateInput input ->
            ( { model | input = input }, Cmd.none )

        Draw ->
            ( model, Task.perform MeasureStart Time.now )

        MeasureStart startTime ->
            let
                result = Parsing.read model.input
            in
            ( { model | drawing = result }
            , Process.sleep 1 -- Donne un tick au navigateur pour render
                |> Task.andThen (\_ -> Time.now)
                |> Task.perform (MeasureEnd startTime)
            )

        MeasureEnd startTime endTime ->
            let
                timeDiff = 
                    Time.posixToMillis endTime - Time.posixToMillis startTime
                        |> toFloat
            in
            ( { model | processingTime = Just timeDiff }
            , Cmd.none
            )

        ToggleZoom ->
            case model.drawing of
                Ok _ ->
                    ( { model | autoZoom = not model.autoZoom }
                    , Task.perform MeasureStart Time.now 
                    )

                Err _ ->
                    ( { model | autoZoom = not model.autoZoom }
                    , Cmd.none
                    )


view : Model -> Html Msg
view model =
    div
        [ style "font-family" "Arial, sans-serif"
        , style "display" "flex"
        , style "flex-direction" "column"
        , style "align-items" "center"
        , style "justify-content" "center"
        , style "min-height" "100vh"
        , style "background-color" "#f0f0f0"
        ]
        [ h1
            [ style "color" "#333" ]
            [ text "Dessin TcTurtle" ]
        
        , div  -- Conteneur champ + bouton
            [ style "background-color" "white"
            , style "padding" "20px"
            , style "border-radius" "8px"
            , style "box-shadow" "0 2px 5px rgba(0,0,0,0.1)"
            , style "max-width" "600px"
            , style "width" "90%"
            ]
            [ textarea
                [ placeholder "Ex: [Repeat 4 [Forward 50, Left 90]]"
                , value model.input
                , onInput UpdateInput
                , style "width" "100%"
                , style "height" "50px"
                , style "box-sizing" "border-box"
                , style "resize" "none"
                ]
                []
            , div
                [ style "display" "flex"
                , style "gap" "10px"
                , style "margin-top" "16px"
                ]
                [ button
                    [ onClick Draw
                    , style "padding" "10px 20px"
                    , style "background-color" "#007BFF"
                    , style "color" "white"
                    , style "border" "none"
                    , style "border-radius" "4px"
                    , style "cursor" "pointer"
                    ]
                    [ text "Dessiner" ]
                , button
                    [ onClick ToggleZoom
                    , style "padding" "10px 20px"
                    , style "background-color" (if model.autoZoom then "#28a745" else "#6c757d")
                    , style "color" "white"
                    , style "border" "none"
                    , style "border-radius" "4px"
                    , style "cursor" "pointer"
                    ]
                    [ text ("Zoom auto: " ++ (if model.autoZoom then "ON" else "OFF")) ]
                ]
            ]
        
        , div  -- Conteneur du canvas/erreur SEULEMENT
            [ style "margin-top" "30px"
            , style "padding" "20px"
            , style "background-color" "#ffffff"
            , style "border-radius" "8px"
            , style "box-shadow" "0 2px 5px rgba(0,0,0,0.1)"
            ]
            [ case model.drawing of
                Ok program ->
                    div []
                        [ display model.autoZoom program
                        , case model.processingTime of
                            Just t ->
                                div 
                                    [ style "color" "green"
                                    , style "margin-top" "10px" 
                                    , style "text-align" "center" ]
                                    [ text ("Temps de traitement : " 
                                        ++ String.fromFloat t 
                                        ++ " ms") ]
                            Nothing ->
                                text ""
                        ]
                Err err ->
                    div
                        [ style "color" "red"
                        , style "font-weight" "bold"
                        , style "padding" "20px"
                        , style "background-color" "#fff0f0"
                        , style "border-radius" "4px"
                        , style "border" "1px solid #ffcccc"
                        ]
                        [ text err ]
            ]
        ]
        
