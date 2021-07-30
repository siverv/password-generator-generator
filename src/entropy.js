import {loadPyodide} from './thirdParty/pyodide/pyodide.mjs';
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

export function adjacencyMatrix(states){
    let matrix = new Map();
    for(let state of states){
        let row = new Map();
        matrix.set(state, row);
        for(let {weight, tokens} of state.emit){
            for(let otherState of states){
                if(windowContains(otherState.window, state.window.concat(new Set([tokens])))){
                    let existingValue = row.get(otherState) || 0;
                    row.set(otherState, existingValue + weight * tokens.size);
                    break;
                }
            }
        }
    }
    return matrix;
}

export function numericalMatrix(states, adjMatrix) {
    if(!adjMatrix){
        adjMatrix = adjacencyMatrix(states);
    }
    let matrix = [];
    for(let i = 0; i < states.length; i++){
        let state = states[i];
        let row = [];
        matrix[i] = row;
        let stateRow = adjMatrix.get(state);
        for(let j = 0; j < states.length; j++){
            let otherState = states[j];
            row[j] = stateRow.get(otherState) || 0;
        }
    }
    return matrix
}

export async function getPyodide(){
    if(window.py){
        return window.py;
    } else if(window.pyPromise){
        return await window.pyPromise;
    } else {
        window.pyPromise = new Promise((resolve, reject) => {
            let originSuffix = window.location.origin.endsWith("github.io") ? "/password-generator-generator" : "";
            loadPyodide({
                // indexURL : "https://cdn.jsdelivr.net/pyodide/v0.17.0/full/"
                indexURL : `${window.location.origin}${originSuffix}/src/thirdParty/pyodide/`
            }).then(async py => {
                await py.loadPackage(["numpy"]);
                window.py = py;
                resolve(py);
            })
        })
        return await window.pyPromise;
    }
}

export async function largestPositiveEigenvalue(matrix){
    let py = await getPyodide();
    // if(!window.py){
    //     throw new Error("Pyodide not loaded.");
    // }
    py.globals.set("matrix", py.toPy(matrix));
    return py.runPython(`
        import numpy as np
        val, vec = np.linalg.eig(np.asarray(matrix))
        max(np.real(val))
    `);
}

export async function calculateEntropy(states){
    let matrix = numericalMatrix(states);
    return await largestPositiveEigenvalue(matrix);
}
