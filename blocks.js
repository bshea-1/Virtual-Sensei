/*
 * Virtual Sensei
 * Copyright (c) 2026 Brennan Shea. All rights reserved.
 * Unauthorized use, copying, or distribution is strictly prohibited.
 * See LICENSE file for details.
 */

// blocks.js — MakeCode Arcade block reference extracted from arcade.makecode.com
// This is injected into the system prompt so the AI knows exactly which blocks exist and where they live.

export const MAKECODE_BLOCK_REFERENCE = `
MAKECODE ARCADE BLOCK REFERENCE (use this to give accurate hints):

SPRITES (#4B7BEC):
  - set mySprite to sprite [] of kind Player
  - set mySprite to sprite [] of kind Enemy/Food/Projectile
  - on created sprite of kind [Player/Enemy/Food/Projectile]
  - on destroyed sprite of kind [Player/Enemy/Food/Projectile]
  - on sprite of kind [Player] overlaps otherSprite of kind [Enemy]
  - set mySprite velocity to vx [] vy []
  - set mySprite position to x [] y []
  - set mySprite x/y to []
  - change mySprite x/y by []
  - mySprite x / mySprite y
  - set mySprite stay in screen [on/off]
  - set mySprite ghost [on/off]
  - destroy mySprite
  - destroy mySprite with effect [spray/fire/disintegrate/hearts/smiles/confetti]
  - sprite of kind [Player] get/count
  - set mySprite image to []
  - mySprite say "" for [] ms

CONTROLLER (#D54322):
  - move mySprite with buttons
  - move mySprite with buttons vx [] vy []
  - on A button pressed
  - on B button pressed
  - on any button pressed
  - is A button pressed
  - on player 2/3/4 A button pressed
  - controller dx (left-right)
  - controller dy (up-down)

GAME (#8854D0):
  - on game update
  - on game update every [] ms
  - game over [WIN/LOSE]
  - set game over effect to [confetti/melt/slide/dissolve/pixelate]
  - use [splash] to show text
  - splash ""
  - game.ask ""
  - show long text "" [bottom/top/left/right/full]
  - time since start (s)

MUSIC (#E30FC0):
  - play melody "" at tempo []
  - play sound [ba ding / power up / power down / magic wand / jump / big crash]
  - stop all sounds
  - ring tone [] for [] ms
  - rest for [] ms
  - music set volume []
  - set built-in melody to []

SCENE (#4B6584):
  - set background color to []
  - set background image []
  - set tile map to []
  - set tile [] at col [] row []
  - place mySprite on top of random []
  - on sprite of kind [Player] hits wall []
  - tile at col [] row [] is wall
  - camera follow sprite mySprite
  - camera shake by [] pixels for [] ms
  - screen width (160)
  - screen height (120)
  - set tile [] with wall [on/off]

INFO (#CF6A87):
  - set score to []
  - change score by []
  - score
  - set high score to []
  - on score []
  - set life to []
  - change life by []
  - life
  - on life zero
  - set countdown to [] seconds
  - on countdown end
  - start countdown [] seconds

LOOPS (#20BF6B):
  - on start
  - forever
  - pause [] ms
  - repeat [] times
  - while []
  - for index from 0 to []
  - for element value of list []

LOGIC (#45AAF2):
  - if <> then
  - if <> then / else
  - <> and <>
  - <> or <>
  - not <>
  - 0 = 0 / 0 ≠ 0 / 0 < 0 / 0 > 0 / 0 ≤ 0 / 0 ≥ 0
  - true / false

VARIABLES (#EC3B59):
  - set myVariable to []
  - change myVariable by []
  - myVariable

MATH (#A55EEA):
  - 0 + 0 / 0 - 0 / 0 × 0 / 0 ÷ 0
  - pick random 0 to []
  - remainder of [] ÷ []
  - absolute of []
  - min of [] and []
  - max of [] and []
  - constrain [] between [] and []
  - % chance (NOTE: This block is strictly in the MATH category)

ANIMATION (#03AA74):
  - animate mySprite with frames [] interval [] ms
  - animate mySprite with [fly/blink/bump] for [] ms
  - stop all animations

IMAGES (#A5B1C2):
  - create image width [] height []
  - image of mySprite
  - clone picture
  - picture width / picture height
  - picture get pixel at x [] y []
  - picture set pixel at x [] y [] to []
  - fill picture with []
  - draw rectangle on picture

FUNCTIONS (#1446A0):
  - make a function
  - call myFunction
  - (custom function definitions)

ARRAYS (#FF8F08):
  - set list to array of [1, 2, 3]
  - set text list to array of ["a", "b", "c"]
  - list get value at []
  - list set value at [] to []
  - list length
  - list add value [] at end
  - list remove value at []
  - list insert value at []

TEXT (#F5D547):
  - "" (string literal)
  - length of ""
  - join "" + ""
  - "" char at []
  - parse "" to number
  - convert [] to text
  - "" includes ""
  - "" split at ""
`;
