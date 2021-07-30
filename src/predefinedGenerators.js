import {monograms} from './data/monograms.mjs';
import {bigrams} from './data/bigrams.mjs';
import {trigrams} from './data/trigrams.mjs';

const predefinedGens = new Map();

predefinedGens.set("Numerical", `
groups:
    n: "0123456789"

states:
    -   window: []
        emit: n
`)

predefinedGens.set("Alphanumerical", `
groups:
    n: "0123456789"
    a: abcdefghijklmnopqrstuvwxyz
    A: ABCDEFGHIJKLMNOPQRSTUVWXYZ

states:
    -   window: []
        emit: 10 * a + A + n
`)

predefinedGens.set("Syllabetical", `
groups:
    v: aeiouy
    c: bcdfghjklmnpqrstvwxz

states:
    -   name: consonant
        window: [c]
        emit: v
    -   name: vowel
        window: [v]
        emit: c
`)

predefinedGens.set("Pronouncible (basic)", `
groups:
    v: aeiouy
    c: bcdfghjklmnpqrstvwxz
    a: abcdefghijklmnopqrstuvwxyz

states:
    -   name: vowel
        window: [v]
        emit: 10 * c + 1 * v
    -   name: double-vowel
        window: [v, v]
        emit: c
    -   name: consonant
        window: [c]
        emit: 10 * v + 1 * c
    -   name: double-consonant
        window: [c, c]
        emit: v
`)


predefinedGens.set("Semi-pronouncible", `
groups:
    v: aeiouy
    V: AEIOUY
    c: bcdfghjklmnpqrstvwxz
    C: BCDFGHJKLMNPQRSTVWXZ
    n: "0123456789"
    a: abcdefghijklmnopqrstuvwxyz
    A: ABCDEFGHIJKLMNOPQRSTUVWXYZ

states:
    -   name: other
        window: []
        emit: a + A + n
    -   name: vowel
        window: [v + V]
        emit: 100 * c + 50 * v + A + n 
    -   name: double-vowel
        window: [v + V, v + V]
        emit: 10 * c + C
    -   name: consonant
        window: [c + C]
        emit: 100 * v + 10 * c + A + n 
    -   name: double-consonant
        window: [c + C, c + C]
        emit: 10 * v + V
`)

predefinedGens.set("Correct Horse Battery Staple", `
groups:
    words:
        - Correct
        - Horse
        - Battery
        - Staple
        - ...

states:
    -   window: []
        emit: words
`)


predefinedGens.set("Correct Horse Fair Dice", `
groups:
    words:
        - Correct
        - Horse
        - Battery
        - Staple
        - ...
    fair-dice-roll: "4"  # <-- chosen by a fair dice roll

states:
    -   window: [fair-dice-roll]
        emit: words + fair-dice-roll
    -   window: [words]
        emit: fair-dice-roll
`)


// TODO: Fix problem with different window sizes.
// predefinedGens.set("Correct Horse Yahtzee Staple", `
// groups:
//     words:
//         - Correct
//         - Horse
//         - Battery
//         - Staple
//     fair-dice-roll: "123456"

// states:
//     -   window: [fair-dice-roll, fair-dice-roll, fair-dice-roll, fair-dice-roll, fair-dice-roll]
//         emit: words
//     -   window: []
//         emit: fair-dice-roll
// `)


predefinedGens.set("1-grams", `
groups: []

states:
    -   window: []
        emit:
${Array.from(monograms.entries()).map(([key, value]) => {
    return `
            -   weight: ${value}
                tokens: ${key[0].toLowerCase()}`
}).join("")}
`)

const alphabet = Array.from("abcdefghijklmnopqrstuvwxyz");

predefinedGens.set("Bigrams", `
states: ${alphabet.map(first => {
    return `
    -   name: ${first}
        window: [${first}]
        emit: ${alphabet.map(second => {
            return `
        -   weight: ${bigrams.get((first + second).toUpperCase())}
            tokens: ${second}`
        }).join("")}
`}).join("")}
`)


predefinedGens.set("Bigrams Case-Agnostic", `
states: ${alphabet.map(first => {
    return `
    -   name: ${first}
        window: [${first + first.toUpperCase()}]
        emit: ${alphabet.map(second => {
            return `
        -   weight: ${bigrams.get((first + second).toUpperCase())}
            tokens: ${second}${second.toUpperCase()}`
        }).join("")}
`}).join("")}
`)


let N = 13;
let quantizedBigrams = new Map(alphabet.map(first => {
    let scores = alphabet.map(second => [second, bigrams.get((first + second).toUpperCase())]);
    scores.sort((a,b) => a[1] - b[1]);
    let groupSize = Math.floor(scores.length / N);
    let quantizedSets = scores.map(
        ([second, score], index) => {
            return [second, Math.floor(index/groupSize)]
        }
    ).reduce((map, [second, score]) => {
        map.set(
            score,
            (map.get(score)||"")+second
        )
        return map;
    }, new Map());
    return [first, quantizedSets]
}))

predefinedGens.set("Quantized bigrams with shakeup", `
groups: 
    ABC: ${alphabet.join("").toUpperCase()}

states:
${Array.from(quantizedBigrams).map(([first, quantizedSets]) => {
    return `
    -   name: ${first}
        window: [${first}${first.toUpperCase()}]
        emit: ${Array.from(quantizedSets).map(([score, seconds]) => {
            return `
        -   weight: ${Math.pow(2,score-(N-6))}
            tokens: ${seconds}`
        }).join("")}
        -   ABC
`}).join("")}
`)


let vowels = new Set("AEIOUY");

let orderedBigrams = Array.from(bigrams.entries())
    .sort((a,b) => a[1] - b[1]);

let doubleCategoryBigrams = orderedBigrams.filter(([bi]) => {
    return vowels.has(bi[0]) === vowels.has(bi[1]); 
})

let topPercentiles = new Map(doubleCategoryBigrams.slice(Math.floor(doubleCategoryBigrams.length * 0.80)))

predefinedGens.set("Syllabetical except top 20 percentile bigrams", `
groups:
    vowels: aeiouy
    VOWELS: AEIOUY
    cons: bcdfghjklmnpqrstvwxz
    CONS: BCDFGHJKLMNPQRSTVWXZ

states:
${Array.from(alphabet).map(first => {
    return `
    -   name: ${first}
        window: [${first}${first.toUpperCase()}]
        emit: ${Array.from(alphabet)
            .filter(second => topPercentiles.has((first+second).toUpperCase()))
            .map((second) => {
                return `
        -   weight: 2
            tokens: ${second}`}).join("")}
        -   ${vowels.has(first.toUpperCase()) ? "cons" : "vowels"} + 0.1 * ${vowels.has(first.toUpperCase()) ? "CONS" : "VOWELS"}`}).join("")}
`)


predefinedGens.set("Syllabetical except top 20 percentile bigrams (triplet protection)", `
groups:
    vowels: aeiouy
    VOWELS: AEIOUY
    cons: bcdfghjklmnpqrstvwxz
    CONS: BCDFGHJKLMNPQRSTVWXZ

states:
    -   name: double-vowel
        window: [vowels + VOWELS, vowels + VOWELS]
        emit: cons + 0.1 * CONS
    -   name: double-cons
        window: [cons + CONS, cons + CONS]
        emit: vowels + 0.1 * vowels
${Array.from(alphabet).map(first => {
    return `
    -   name: ${first}
        window: [${first}${first.toUpperCase()}]
        emit: ${Array.from(alphabet)
            .filter(second => topPercentiles.has((first+second).toUpperCase()))
            .map((second) => {
                return `
        -   weight: 2
            tokens: ${second}`}).join("")}
        -   ${vowels.has(first.toUpperCase()) ? "cons" : "vowels"} + 0.1 * ${vowels.has(first.toUpperCase()) ? "CONS" : "VOWELS"}`}).join("")}
`)




export default predefinedGens;
