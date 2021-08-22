import { setUnion, setSub, setIntersect, setOverlap, makeSetsDisjoint } from "./utils/setUtils.js";
import yaml from './thirdParty/yaml.js';
import { createIconPNGDataURI, createIconSVGDataURI, createManifestDataURI } from "./utils/pwaUtils.js";

export function parseSpecification(specification){
    let json = yaml.load(specification);
    let groupNameMap = new Map(Array.from(Object.entries(json.groups||{})).map(([key, group]) => {
        return [key, new Set(group)];
    }));
    // TODO: Name non-group token sets. 
    // function getGroupOrDefineNewGroup(tokens, groupNameMap){
    //     if(Array.isArray(tokens)){
    //         let groupEntry = Array.from(groupNameMap).
    //     } else if(typeof tokens === "string"){
            
    //     } else if(typeof tokens === "object"){
    //         if(tokens.group){
    //         } else if(tokens.groups){
    //             let combinedSet = setUnion(...tokens)
    //         } else if(tokens.tokens){
    //             return getGroupOrDefineNewGroup(tokens.tokens);
    //         }
    //     }
    //     if(groupNameMap.has(str)){
    //         return groupNameMap.get(str);
    //     } else {
    //         let name = 
    //     }
    // }
    function parseGroupMult(str) {
        let match = str.match(/^\s*(?<weight>[0-9.]+)\s*\*\s*(?<group>.+)\s*$/);
        if(match){
            return {
                weight: parseFloat(match.groups.weight),
                tokens: groupNameMap.get(match.groups.group) || new Set(match.groups.group)
            };
        } else {
            return {
                weight: 1,
                tokens: groupNameMap.get(str) || new Set(str)
            };
        }
    }
    function parseGroupArithmetic(str){
        if(str.includes("+")){
            return str.split("+").map(term => {
                return parseGroupMult(term.trim());
            });
        } else return [parseGroupMult(str.trim())];
    }
    function parseWindowStep(step){
        if(typeof step === "string"){
            return new Set(parseGroupArithmetic(step).map(group => group.tokens));
        } else if(Array.isArray(step)){
            return new Set(step.flatMap(parseGroupArithmetic).map(group => group.tokens));
        } else if(typeof step === "object" && (step.tokens || step.groups)){
            return step.tokens ?
                new Set(step.tokens)
                : step.groups.flatMap(group => groupNameMap.get(group));
        } else {
            return new Set();
        }
    }
    function parseEmissions(emit){
        if(typeof emit === "string"){
            return parseGroupArithmetic(emit);
        } else if(Array.isArray(emit)){
            return emit.flatMap(parseEmissions);
        } else if(typeof emit === "object" && (emit.tokens || emit.groups)){
            return [{
                weight: emit.weight || 1,
                tokens: emit.tokens ?
                    new Set(emit.tokens)
                    : emit.groups.flatMap(group => groupNameMap.get(group))
            }];
        } else {
            return [];
        }
    }
    let states = json.states.map((state, index) => {
        return {
            name: state.name || `state#${index}`,
            window: state.window.map(parseWindowStep),
            emit: parseEmissions(state.emit)
        };
    });
    let labelMap = new Map(Array.from(groupNameMap).map(([label, set]) => [set, label]));
    ({states, labelMap} = normalizeStates(states, labelMap));
    ({states, labelMap} = disjointStates(states, labelMap));
    return {states, labelMap};
}

function normalizeStates(states, labelMap){
    let setList = states.flatMap(state =>
        state.window.flatMap(step => Array.from(step))
            .concat(state.emit.map(pair => pair.tokens))
    );
    let {
        domain,
        setMap,
        labelMap: newLabelMap
    } = makeSetsDisjoint(setList, labelMap);
    labelMap = newLabelMap;
    states.sort((a,b) =>
        (b.window.length - a.window.length)
        || (states.indexOf(a) - states.indexOf(b))
    );
    let windowSize = Math.max(1, ...states.map(state => state.window.length));
    let basicWindow = Array.from({length: windowSize}).map(() => new Set([domain]));
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
            };
        });
    }
    states = states.map(state => {
        return {
            ...state,
            window: normalizeWindow(state.window),
            emit: normalizeEmissions(state.emit)
        };
    });
    return {states, labelMap};
}

function disjointStates(states, labelMap){
    function makeDisjointWindows(primary, secondary) {
        let disjoint = [];
        let current = secondary;
        for(let s = primary.length-1; s >= 0; s--){
            if(!setOverlap(current[s], primary[s])){
                disjoint.push(current);
                break;
            }
            let next = current.slice();
            next[s] = setSub(next[s], primary[s]);
            if(next[s].size > 0){
                disjoint.push(next);
            }
            if(s > 0){
                next = current.slice();
                next[s] = setIntersect(next[s], primary[s]);
                current = next;
            }
        }
        return disjoint;
    }
    states = states.slice();
    for(let i = 0; i < states.length; i++){
        let state = states[i];
        let relativeStates = states.splice(i + 1, Infinity);
        for(let laterState of relativeStates){
            let disjointWindows = makeDisjointWindows(state.window, laterState.window);
            for(let w = 0; w < disjointWindows.length; w++){
                states.push({
                    ...laterState,
                    window: disjointWindows[w],
                    name: w === 0 ? laterState.name : `${laterState.name} - (${state.name})${disjointWindows.length > 2 ? `[${w}]` : ""}`
                });
            }
        }
    }
    return {states, labelMap};
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
            };
        }));
    }


    let security = 0;
    while(output.length < N + windowLength) {
        if(security++ > N * 2){
            console.log("oops", output);
            return;
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
    });
}

function deserializeStates(jsonStates){
    return JSON.parse(jsonStates, (k, v) => {
        if(k === "window"){
            return v.map(step => new Set(step.map(set => new Set(set))));
        } else if(k === "tokens") {
            return new Set(v);
        } else return v;
    });
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
`;
}

export function generateGeneratorAsBookmarklet(states, options){
    let jsString = generateGeneratorAsJSString(states, options);
    return `javascript:alert((${jsString.replace(/\s+/g," ")})())`;
}

export async function generateGeneratorAsHTML(states, options) {
    let jsString = generateGeneratorAsJSString(states, options);
    let template = document.getElementById("password-generator-html-body");
    let snippet = template.content.cloneNode(true);
    let script = snippet.querySelector("script");
    script.innerHTML = script.innerText.replace("/*@PASSWORD_GENERATOR_GOES_HERE@*/", jsString);
    let iconSVGDataURI = createIconSVGDataURI(generatePassword(states, 36));
    let iconPNGDataURI = await createIconPNGDataURI(iconSVGDataURI);
    let manifestDataURI = createManifestDataURI();
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">${options.pwa ? `
    <link rel="shortcut icon" type="image/svg+xml" href="${iconSVGDataURI}"/>
    <link rel="apple-touch-icon" href="${iconPNGDataURI}"/>
    <link rel="manifest" href="${manifestDataURI}"/>` : ''}
    <title>Password Generator</title>
</head>
<body>
    ${snippet.firstElementChild.outerHTML}
</body>
</html>`;
}

export async function generateGeneratorAsDataURI(states, options) {
    let htmlString = await generateGeneratorAsHTML(states, options);
    return `data:text/html;base64,${btoa(htmlString)}`;
}




function windowContains(windowA, windowB){
    for(let i = 0; i < windowA.length; i++){
        let a = setUnion(...windowA[windowA.length - 1 - i]);
        let b = setUnion(...windowB[windowB.length - 1 - i]);
        if(setIntersect(a,b).size < b.size){
            return false;
        }
    }
    return true;
}

export function getGraphEdges(states){
    let graphEdges = new Map();
    for(let state of states){
        let outgoingEdges = new Map();
        graphEdges.set(state, outgoingEdges);
        for(let emission of state.emit){
            for(let otherState of states){
                if(windowContains(otherState.window, state.window.concat(new Set([emission.tokens])))){
                    let edgesToOtherState = outgoingEdges.get(otherState) || new Set();
                    edgesToOtherState.add(emission);
                    outgoingEdges.set(otherState, edgesToOtherState);
                    break;
                }
            }
        }
    }
    return graphEdges;
}

export function toDot(states, labelMap){
    let stateKeyMap = new Map(states.map((state, index) => [state, `state${index}`]));
    let graphEdges = getGraphEdges(states);
    let dotEdgeLines = [];
    for(let [state, outgoingEdges] of graphEdges){
        let sourceKey = stateKeyMap.get(state);
        dotEdgeLines.push(`${sourceKey} [label="${state.name}"];`);
        for(let [otherState, edges] of outgoingEdges) {
            let targetKey = stateKeyMap.get(otherState);
            for(let edge of edges) {
                let modifiers = [];
                if(edge.weight != 1){
                    modifiers.push("style=dotted");
                }
                let edgeLabel = labelMap.get(edge.tokens) || [...edge.tokens].toString().slice(0,20);
                modifiers.push(`label="${edgeLabel}"`);
                dotEdgeLines.push(`${sourceKey} -> ${targetKey} [${modifiers}];`);
            }
        }
    }
    return `digraph G {
    ${dotEdgeLines.join("\n    ")}
}`;
}
