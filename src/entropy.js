import { setUnion, setIntersect } from "./utils/setUtils.js";

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

function minimalEntropyMatrix(states){
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

function minimalEntropyPowerInLogSpace(pi, MEM, N){
    let length = MEM.length;
    let logMEM = MEM.map(r => r.map(c => -Math.log2(c)));
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
    }
    let R = logMEM;
    let ents = [];
    for(let n = 0; n < N; n++) {
        let nR = [];
        ents[n] = minimalEntropyDotLogSpace(logPi, R);
        for(let i = 0; i < length; i++){
            nR[i] = [];
            for(let j = 0; j < length; j++) {
                let m = Infinity
                for(let k = 0; k < length; k++){
                    if(isFinite(R[i][k]) && isFinite(logMEM[k][j])) {
                        m = Math.min(m, R[i][k] + logMEM[k][j]);
                    }
                }
                nR[i][j] = m;
            }
        }
        R = nR;
    }
    ents[N] = minimalEntropyDotLogSpace(logPi, R)
    return ents;
}

export function minimalEntropy(states, pi, N=100) {
    if(states.length > 10){
        N = 10;
    }
    let MEM = minimalEntropyMatrix(states);
    if(!pi){
        pi = Array.from({length: states.length}).map(_ => 1 / states.length);
    }
    let mep = minimalEntropyPowerInLogSpace(pi, MEM, N);
    let general = mep[mep.length - 1] / mep.length;
    return {
        byLength: mep,
        entropy: general,
        equivalentToStandard: Math.pow(2, general)
    }
}
