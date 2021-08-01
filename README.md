
# Password Generator Generator

This is a script and a small web-app to generate password generators using finite state machines (or shifts of finite type) with potentially non-uniform probability of different emissions and support for non-character emissions.

The app produces four kinds of password generators:
* A self-contained JavaScript function
* A bookmarklet alerting a newly generated password
* An HTML-page with "generate"- and "copy"-button
* A data-URI containing the aforementioned HTML-page.

The generators use [window.crypto.getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues) for randomness, and entropy is calculated using [min-entropy](./THEORY.md)

[Demo](https://siverv.github.io/password-generator-generator/)

## Entropy and Pronouncible Passwords

How secure is an automatically generated pronouncible password? Do you need 16, 32, or perhaps even 64 characters to get close to the more secure `B&QlWYrj#$3A-&4P`-type passwords. The application uses min-entropy to calculate the entropy of the resulting adjacency matrix from the states. From this entropy calculation, one may judge whether a given password scheme is strong enough for the desired use.

## Correct Horses, and their Battery Staples

One may use non-character tokens to replicate the classic [Correct Horse Battery Staple](https://xkcd.com/936/), though a single state and uniform probability makes both the generator and its entropy is wholly dependent on the wordlist. For example, xkcd's calculation example uses `2^11=2048` words.

More states generally means less entropy, but since the CHBS-state uses many characters per token to achieve its 11 bits of entropy, adding a few more states can increase entropy-per-character while still maintaining some of its memorability.

```
groups:
    words:
        - Correct
        - Horse
        - Battery
        - Staple
        - ...
    fair-dice-roll: "4"

states:
    -   window: [fair-dice-roll]
        emit: words + 5 * fair-dice-roll
    -   window: [words]
        emit: fair-dice-roll
```

## The Specification Format

The specification is a yml-formatted text containing two fields: `groups` and `states`. `groups` is an optional field.

Example of a simple syllabetical password generator:

```
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

```

### Groups

The optional `groups`-field contains a simple map of group-names to token sets. If the token-set is a simple string, each character is treated as a token. If the token-set is an array, each item in the array is considered as a token.

### States

The `states`-field is a list of states, with a `window`-, `emit`- and (optionally) `name`-field.

`window` is an array of tokens that need to match in the output. The window (in short-hand) form `[a,b,c]` matches any output [...,a,b,c]. If there is a group named `a`, `b`, or `c`, that group will be used instead of the letters, otherwise each character will be treated as a token here. The set of possibilities for each window can also be objects with a field `groups` or `tokens` if one wants to be explicit.

`emit` is an array of objects `{weight: number, tokens: Set<string>}` (or with a `groups`-field instead of `tokens`-field). In shorthand-form, one may write `a + n * b + m * c`, in which `a`, `b`, and `c` are groups names or tokenstrings, and `n` and `m` are numbers representing weight.

### Credits


* My knowledge of symbolic dynamics can be credited to Douglas Lind, who wrote [The Book](https://faculty.washington.edu/lind/symbolic-book/), and held a wonderful Danish-Norwegian master-class on the subject back in 2015. 
* Inspiration from the LastPass pronouncible password generator on iOS, for being pronouncible but not including any measure of entropy or recommendations about length. 
* [lz-string](https://github.com/pieroxy/lz-string/) to compress the state before storing it in a hash.
* [js-yaml](https://github.com/nodeca/js-yaml) for parsing the specification format
* [@hpcc/wasm](https://github.com/hpcc-systems/hpcc-js-wasm) for visualizing dot-diagrams with graphviz
* [KaTeX](https://katex.org/) for rendering the math of [THEORY.md](https://siverv.github.io/password-generator-generator/?main-tabs=2)
* The `wc-tab-panel` web component is based on the code from [ndesmic's wc-lib](https://github.com/ndesmic/wc-lib) 
