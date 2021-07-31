import { setUnion, setSub, setIntersect, setOverlap, makeSetsDisjoint } from "./utils/setUtils.js";
import yaml from './thirdParty/yaml.js';

export function parseSpecification(specification){
    let json = yaml.load(specification);
    let groups = new Map(Array.from(Object.entries(json.groups||{})).map(([key, group]) => {
        return [key, new Set(group)];
    }));
    function parseGroupMult(str) {
        let match = str.match(/^\s*(?<weight>[0-9.]+)\s*\*\s*(?<group>.+)\s*$/);
        if(match){
            return {
                weight: parseFloat(match.groups.weight),
                tokens: groups.get(match.groups.group) || new Set(match.groups.group)
            }
        } else {
            return {
                weight: 1,
                tokens: groups.get(str) || new Set(str)
            }
        }
    }
    function parseGroupArithmetic(str){
        if(str.includes("+")){
            return str.split("+").map(term => {
                return parseGroupMult(term.trim());
            })
        } else return [parseGroupMult(str.trim())]
    }
    function parseWindowStep(step){
        if(typeof step === "string"){
            return new Set(parseGroupArithmetic(step).map(group => group.tokens));
        } else if(Array.isArray(step)){
            return new Set(step.flatMap(parseGroupArithmetic).map(group => group.tokens));
        } else if(typeof step === "object" && (step.tokens || step.groups)){
            return step.tokens ?
                    new Set(step.tokens)
                    : step.groups.flatMap(group => groups.get(group));
        } else {
            return new Set();
        }
    }
    function parseEmissions(emit){
        if(typeof emit === "string"){
            return parseGroupArithmetic(emit);
        } else if(Array.isArray(emit)){
            return emit.flatMap(parseEmissions)
        } else if(typeof emit === "object" && (emit.tokens || emit.groups)){
            return [{
                weight: emit.weight || 1,
                tokens: emit.tokens ?
                    new Set(emit.tokens)
                    : emit.groups.flatMap(group => groups.get(group))
            }]
        } else {
            return [];
        }
    }
    let states = json.states.map((state, index) => {
        return {
            name: state.name || `state#${index}`,
            window: state.window.map(parseWindowStep),
            emit: parseEmissions(state.emit)
        }
    });
    states = normalizeStates(states);
    states = disjointStates(states);
    return states;
}

function normalizeStates(states){
    let setList = states.flatMap(state =>
        state.window.flatMap(step => Array.from(step))
            .concat(state.emit.map(pair => pair.tokens)
        )
    );
    let {
        domain,
        setMap,
    } = makeSetsDisjoint(setList);
    states.sort((a,b) =>
        (b.window.length - a.window.length)
        || (states.indexOf(a) - states.indexOf(b))
    );
    let windowSize = Math.max(1, ...states.map(state => state.window.length));
    let basicWindow = Array.from({length: windowSize}).map(_ => new Set([domain]));
    function normalizeWindow(window){
        return basicWindow.concat(window)
            .slice(-windowSize)
            .map(sets => new Set(Array.from(sets).flatMap(set => Array.from(setMap.get(set)))));
    }
    function normalizeEmissions(emissions){
        let disjointEmissionWeights = new Map();
        for(let emission of emissions){
            let disjointEmissions = setMap.get(emission.tokens);
            for(let set of disjointEmissions){
                let existingWeight = disjointEmissionWeights.get(set) || 0;
                disjointEmissionWeights.set(set, existingWeight + emission.weight);
            }
        }
        let maxWeight = Math.max(...disjointEmissionWeights.values());
        return Array.from(disjointEmissionWeights).map(([tokens, weight]) => {
            return {
                weight: weight / maxWeight,
                tokens
            }
        })
    }
    states = states.map(state => {
        return {
            ...state,
            window: normalizeWindow(state.window),
            emit: normalizeEmissions(state.emit)
        }
    })
    return states;
}

function disjointStates(states){
    /*
    Given:
        [a + b, c + d]
        [x + b, y + d]
    Produce:
        [a + b, c + d]
        [(x + b) \ (a + b), (y + d) Λ (c + d)}] => [x, d]
        [x + b, (y + d) \ (c + d)] => [x + b, y]
    */
    states = states.slice();
    for(let i = 0; i < states.length; i++){
        let state = states[i];
        let relativestates = states.splice(i + 1, Infinity);
        for(let step = state.window.length - 1; step >= 0; step--){
            let windowStepSets = state.window[step];
            let windowsNextStepSets = state.window[step - 1];
            let nextRelativestates = [];
            while(relativestates.length > 0) {
                let otherState = relativestates.shift();
                let otherSets = otherState.window[step];
                if(!setOverlap(otherSets, windowStepSets)){
                    states.push(otherState);
                    continue;
                }
                if(step > 0){
                    let newWindow = otherState.window.slice();
                    newWindow[step] = setIntersect(newWindow[step], windowStepSets);
                    if(newWindow[step].size > 0) {
                        newWindow[step - 1] = setSub(newWindow[step - 1], windowsNextStepSets);
                        if(newWindow[step - 1].size > 0) {
                            nextRelativestates.push({
                                ...otherState,
                                name: `${otherState.name} - (${state.name})`,
                                window: newWindow
                            });
                        }
                    }
                }
                let newWindow = otherState.window.slice();
                newWindow[step] = setSub(newWindow[step], windowStepSets);
                if(newWindow[step].size > 0){
                    states.push({
                        ...otherState,
                        window: newWindow
                    });
                }
            }
            relativestates = nextRelativestates;
        }
    }
    return states;
}

function pickFromSet(set, randomInteger){
    return Array.from(set)[randomInteger % set.size];
}

function outputMatchesWindow(output, window){
    for(let i = 0; i < window.length; i++){
        let found = false;
        let windowSets = window[window.length - 1 - i];
        for(let set of windowSets){
            if(set.has(output[output.length - 1 - i])){
                found = true;
                continue;
            }
        }
        if(!found){
            return false;
        }
    }
    return true;
}

function randomChoiceOfEmissionInterval(emissionWeightIntervals, totalEmissionWeight) {
    if(emissionWeightIntervals.length < 2){
        return emissionWeightIntervals[0].emit;
    }
    let random = new Uint32Array(2);
    window.crypto.getRandomValues(random);
    let minValue = 0;
    let maxValue = totalEmissionWeight;
    let relevantIntervals = emissionWeightIntervals.slice();
    let dataView = new DataView(random.buffer);
    let byte = 0;
    while(relevantIntervals.length > 1 && byte < dataView.byteLength) {
        let value = dataView.getUint8(byte);
        for(let i = 1; i <= 256; i *= 2){
            let midpoint = (minValue + maxValue) / 2;
            if(value & i){
                minValue = midpoint;
            } else {
                maxValue = midpoint;
            }
        }
        if(minValue === maxValue){
            break;
        }
        relevantIntervals = relevantIntervals
            .filter(interval => !(maxValue <= interval.min || interval.max <= minValue));
        byte++;
    }
    return relevantIntervals[0].emit;
}

export function generatePassword(states, N = 100){
    let windowLength = states[0].window.length;
    let random = new Uint32Array(N * 2 + 3 + windowLength);
    window.crypto.getRandomValues(random);
    let randomIndex = 0;
    let r = () => random[randomIndex++];

    let initialState = states[r() % states.length];

    let output = [];
    for(let i = 0; i < windowLength; i++){
        let windowSets = initialState.window[i];
        let combinedChoice = setUnion(...windowSets);
        output[i] = pickFromSet(combinedChoice, r());
    }

    let totalEmissionWeightMap = new Map();
    for(let state of states){
        let totalWeight = state.emit.reduce((sum, emission) => sum + emission.weight * emission.tokens.size, 0);
        totalEmissionWeightMap.set(state, totalWeight);
    }

    let emissionWeightIntervalsMap = new Map();
    for(let state of states){
        let sum = 0;
        emissionWeightIntervalsMap.set(state, state.emit.map((emission,) => {
            return {
                emit: emission,
                min: sum,
                max: (sum = sum + emission.weight * emission.tokens.size)
            }
        }))
    }


    let security = 0;
    while(output.length < N + windowLength) {
        if(security++ > N * 2){
            console.log("oops", output);
            return
        }
        let found = false;
        for(let state of states){
            if(outputMatchesWindow(output, state.window)){
                let totalEmissionWeight = totalEmissionWeightMap.get(state);
                let emission = randomChoiceOfEmissionInterval(emissionWeightIntervalsMap.get(state), totalEmissionWeight);
                let token = pickFromSet(emission.tokens, r());
                output.push(token);
                found = true;
                break;
            }
        }
        if(!found){
            console.error("dead end", output, states);
            return;
        }
    }
    return output.slice(windowLength).join("");
}


function serializeStates(states){
    return JSON.stringify(states, (k,v) => {
        if(v instanceof Set || v instanceof Map) {
                return Array.from(v);
        } else return v;
    })
}

function deserializeStates(jsonStates){
    return JSON.parse(jsonStates, (k, v) => {
        if(k === "window"){
            return v.map(step => new Set(step.map(set => new Set(set))))
        } else if(k === "tokens") {
            return new Set(v)
        } else return v;
    })
}

export function generateGeneratorAsJSString(states, options){
    let desiredLength = options.desiredLength || 16;
    let jsonStates = serializeStates(states);
    return `
function newPassword(N=${desiredLength}){
    ${options.showSpecification ? `/*\n${options.specification}\n*/` : ''}
    ${pickFromSet.toString()}
    ${randomChoiceOfEmissionInterval.toString()}
    ${outputMatchesWindow.toString()}
    ${setUnion.toString()}
    ${generatePassword.toString()}
    ${deserializeStates.toString()}
    let states = deserializeStates(atob("${btoa(jsonStates)}"));
    return generatePassword(states, N);
}
`
}

export function generateGeneratorAsBookmarklet(states, options){
    let jsString = generateGeneratorAsJSString(states, options);
    return `javascript:alert((${jsString.replace(/\s+/g," ")})())`
}

export function generateGeneratorAsHTML(states, options) {
    let jsString = generateGeneratorAsJSString(states, options);
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Generator</title>
</head>
<body>
    <fieldset>
        <legend>
            <button id="generate">
                Generate Password
            </button>
        </legend>
        <input id="output" type="text">
        <button id="copy">copy</button>
        <script>
            ${jsString}
            document.getElementById("generate").addEventListener("click", () => {
                document.getElementById("output").value = newPassword();
                    document.getElementById("copy").innerText = "Copy"
            })
            document.getElementById("copy").addEventListener("click", () => {
                let value = document.getElementById("output").value;
                if(window.navigator.clipboard) {
                    window.navigator.clipboard.writeText(value);
                    document.getElementById("copy").innerText = "Copied!"
                } else {
                    document.getElementById("copy").innerText = "Copying denied."
                }
            })
        </script>
    </fieldset>
</body>
</html>`
}

export function generateGeneratorAsDataURI(states, options) {
    let htmlString = generateGeneratorAsHTML(states, options);
    return `data:text/html;base64,${btoa(htmlString)}`;
}
