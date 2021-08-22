import { setUnion, setIntersect } from "./utils/setUtils.js";

/**
 * @typedef StateEmission
 * @property {number} weight
 * @property {Set} tokens
 */

/**
 * @typedef State
 * @property {Array<Set<Set>>} window
 * @property {Array<StateEmission>} emit
 */

/**
 * Is `windowB` wholly contained withing `windowA`?
 * Window $[b_i]_i$ is contained in a window $[a_i]_j$ if $a_i \subseteq a_i$ for all $i$.
 * If $a_i$ is not defined, it's the complete set of possible tokens.
 * @param {Array<Set<Set>>} windowA
 * @param {Array<Set<Set>>} windowB 
 * @returns {boolean}
 */
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

/**
 * Given two states indices `i` and `j`, the entry `matrix[i][j]` is the highest probability to go from `i` to `j`.
 * @param {Array<State>} states 
 * @returns {Array<Array<number>>} maximum transition probability matrix
 */
function maximumTransitionProbabilityMatrix(states){
    let stateKeyMatrix = new Map();
    for(let state of states){
        let row = new Map();
        stateKeyMatrix.set(state, row);
        let weightSum = state.emit.reduce((sum,em) => sum + em.weight * em.tokens.size, 0);
        for(let {weight, tokens} of state.emit){
            for(let otherState of states){
                if(windowContains(otherState.window, state.window.concat(new Set([tokens])))){
                    let existingValue = row.get(otherState) || -Infinity;
                    row.set(otherState, Math.max(existingValue, weight / weightSum));
                    break;
                }
            }
        }
    }
    let matrix = [];
    for(let i = 0; i < states.length; i++){
        let state = states[i];
        let row = [];
        matrix[i] = row;
        let stateRow = stateKeyMatrix.get(state);
        for(let j = 0; j < states.length; j++){
            let otherState = states[j];
            row[j] = stateRow.get(otherState) || 0;
        }
    }
    return matrix;
}

/**
 * Calculates the min-entropy of sequences of length up to and including N` 
 * @param {Array<number>} pi initial state probability vector 
 * @param {Array<Array<number>>} MTPM maximum transition probability matrix
 * @param {number} N number of iterations
 * @returns Array<number>
 */

function minimalEntropyPowerInLogSpace(pi, MTPM, N){
    let length = MTPM.length;
    let logMTPM = MTPM.map(r => r.map(c => -Math.log2(c)));
    let logPi = pi.map(p => -Math.log2(p));
    const minimalEntropyDotLogSpace = (v, M) => {
        let m = Infinity;
        for(let i = 0; i < length; i++){
            if(!isFinite(v[i])){
                continue;
            }
            for(let j = 0; j < length; j++){
                if(isFinite(M[i][j])) {
                    m = Math.min(m, v[i] + M[i][j]);
                }
            }
        }
        return m;
    };
    let R = logMTPM;
    let ents = [];
    for(let n = 0; n < N; n++) {
        let nR = [];
        ents[n] = minimalEntropyDotLogSpace(logPi, R);
        for(let i = 0; i < length; i++){
            nR[i] = [];
            for(let j = 0; j < length; j++) {
                let m = Infinity;
                for(let k = 0; k < length; k++){
                    if(isFinite(R[i][k]) && isFinite(logMTPM[k][j])) {
                        m = Math.min(m, R[i][k] + logMTPM[k][j]);
                    }
                }
                nR[i][j] = m;
            }
        }
        R = nR;
    }
    ents[N] = minimalEntropyDotLogSpace(logPi, R);
    return ents;
}

/**
 * Gives the min-entropy and related calculations.
 * @param {Array<State>} states 
 * @param {Array<number>} pi initial state probability vector. By default: uniform probability
 * @param {number} N maximal sequence length of exact entropy for approximation. If more than 10 distinct states, the default is 10 rather than 100.
 * @returns {{
 *  byLength: Array<number>,
 *  entropy: number,
 *  equivalentToStandard: number 
 * }}
 */
export function minimalEntropy(states, pi, N) {
    if(!N){
        if(states.length > 10){
            N = 10;
        } else {
            N = 100;
        }
    }
    let MTPM = maximumTransitionProbabilityMatrix(states);
    if(!pi){
        pi = Array.from({length: states.length}).map(() => 1 / states.length);
    }
    let mep = minimalEntropyPowerInLogSpace(pi, MTPM, N);
    let general = mep[mep.length - 1] / mep.length;
    return {
        byLength: mep,
        entropy: general,
        equivalentToStandard: Math.pow(2, general)
    };
}
