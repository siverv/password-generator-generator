import * as passgen from './passgen.js';
import predefined from './predefinedGenerators.js';
import LZString from './thirdParty/lz-string.mjs';
import "./components/WcTabPanel.js";
import * as entropyLib from './entropy.js';

let entropyInitialized = false;

let entropyButton = document.getElementById("theSourceOfEntropy")
let entropyArea = document.getElementById("theTargetOfEntropy")
entropyButton.addEventListener("click", async () => {
    entropyButton.setAttribute("disabled", "true");
    await entropyLib.getPyodide();
    await entropyLib.largestPositiveEigenvalue([[1]])
    entropyInitialized = true;
    entropyArea.classList.remove("no-entropy")
    entropyButton.remove();
});

async function calcAndDisplayEntropy(states){
    let entropy = await entropyLib.calculateEntropy(states);
    entropyArea.querySelector("#entropyHerePlease").innerText = entropy.toFixed(2);
    entropyArea.querySelector("#bitsOfEntropyHerePlease").innerText = Math.log(entropy, 2).toFixed(2);
}

window.lz = LZString;
window.passgen = passgen;
const defaultPredefined = Array.from(predefined.keys()).pop();

let select = document.getElementById("predefinedSelect");
let textarea = document.getElementById("specification");
let button = document.getElementById("run");

function setParamState(searchParams=location.search, hashParams=location.hash){
    if(searchParams?.[0] !== "?"){
        searchParams = "?" + searchParams;
    }
    if(hashParams?.[0] !== "#"){
        hashParams = "#" + hashParams;
    }
    window.history.replaceState(null, null, searchParams + hashParams)
}

textarea.addEventListener("blur", (ev) => {
    let hashParams = window.location.hash?.slice(1);
    let searchParams = new URLSearchParams(hashParams);
    searchParams.set("specification", LZString.compressToEncodedURIComponent(textarea.value));
    searchParams.delete("predefined");

    setParamState(undefined, "#" + searchParams.toString())
    if(select.value){
        if(predefined.get(select.value) != textarea.value){
            select.value = null;
        }
    }
})

function initialSpecification(){
    let hashParams = window.location.hash?.slice(1);
    if(hashParams){
        let searchParams = new URLSearchParams(hashParams);
        console.log(searchParams.get("predefined"), predefined.get(searchParams.get("predefined")))
        if(searchParams.get("specification")){
            try {
                textarea.value = LZString.decompressFromEncodedURIComponent(searchParams.get("specification"));
                select.value = null;
                return;
            } catch(err){
                console.error(err);
            }
        } else if(searchParams.get("predefined")){
            select.value = searchParams.get("predefined");
        }
    }
    textarea.value = predefined.get(select.value);
}

window.addEventListener("load", () => {
    for(let [key] of predefined) {
        let option = document.createElement("option");
        option.value = key;
        option.innerText = key;
        select.append(option);
    }
    initialSpecification();

    
    select.addEventListener("change", (ev) => {
        console.log("select", ev.target?.value);
        if(ev.target.value && predefined.has(ev.target.value)){
            let genText = predefined.get(ev.target.value);
            if(genText){
                textarea.value = genText;
            }
            let hashParams = window.location.hash?.slice(1);
            let searchParams = new URLSearchParams(hashParams);
            searchParams.set("predefined", ev.target.value)
            searchParams.delete("specification");
            setParamState(undefined, "#" + searchParams.toString())
        }
    })
})

button.addEventListener("click", async () => {
    let specification = textarea.value;
    let states = passgen.parseSpecification(specification);
    let matrix = entropyLib.adjacencyMatrix(states);
    console.log("matrix", Object.fromEntries([...matrix].map(([key, value]) => {
        return [
            key.name,
            Object.fromEntries([...value].map(([key, value]) => {
                return [key.name, value]
            }))
        ];
    })));
    let mathMatrix = entropyLib.numericalMatrix(states, matrix);
    console.log("mathMatrix", mathMatrix, JSON.stringify(mathMatrix));
    let password = passgen.generatePassword(states);


    document.getElementById("sample-output").innerText = passgen.generatePassword(states, 400);

    console.log("password", password);
    window.states = states;
    window.mathMatrix = mathMatrix;

    document.getElementById("gen-jsfn").innerText = passgen.generateGeneratorAsJSString(states);
    let bookmarklet = passgen.generateGeneratorAsBookmarklet(states);
    document.getElementById("gen-book").innerText = bookmarklet;
    document.getElementById("gen-book-link").href = bookmarklet;
    document.getElementById("gen-html").innerText = passgen.generateGeneratorAsHTML(states);
    document.getElementById("gen-data").innerText = passgen.generateGeneratorAsDataURI(states);
    if(entropyInitialized){
        calcAndDisplayEntropy(states);
    }
    document.getElementById("adjacency-matrix").innerText = "["+mathMatrix.map((row, i) => {
        return (i === 0 ? "" : " ") + "["+row.map(n => n.toFixed(2).padStart(6)).join(", ")+"]"
    }).join(",\n\n") + "]"
})
