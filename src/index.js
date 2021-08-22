import * as passgen from './passgen.js';
import predefined from './predefinedGenerators.js';
import LZString from './thirdParty/lz-string.js';
import {minimalEntropy} from './entropy.js';

let select = document.getElementById("predefinedSelect");
let textarea = document.getElementById("specification");
let button = document.getElementById("run");

function copyPrecedingText(ev){
    let elm = ev.target.previousElementSibling;
    let value;
    if(elm.tagName === "INPUT" || elm.tagName === "TEXTAREA") {
        value = elm.value;
    } else {
        value = elm.innerText;
    }
    if(window.navigator.clipboard) {
        window.navigator.clipboard.writeText(value);
        ev.target.innerText = "Copied!";
    } else {
        ev.target.innerText = "Copying denied.";
    }
    clearTimeout(ev.target.resetTextTimeout);
    ev.target.resetTextTimeout = setTimeout(() => ev.target.innerText = "Copy", 3000);
}
Array.from(document.getElementsByClassName("copy-preceding-text")).forEach(elm => {
    elm.addEventListener("click", copyPrecedingText);
});

function setParamState(searchParams=location.search, hashParams=location.hash){
    if(searchParams?.[0] !== "?"){
        searchParams = "?" + searchParams;
    }
    if(hashParams?.[0] !== "#"){
        hashParams = "#" + hashParams;
    }
    window.history.replaceState(null, null, searchParams + hashParams);
}

textarea.addEventListener("blur", () => {
    let hashParams = window.location.hash?.slice(1);
    let searchParams = new URLSearchParams(hashParams);
    searchParams.set("specification", LZString.compressToEncodedURIComponent(textarea.value));
    searchParams.delete("predefined");

    setParamState(undefined, "#" + searchParams.toString());
    if(select.value){
        if(predefined.get(select.value) != textarea.value){
            select.value = null;
        }
    }
});

function initialSpecification(){
    let hashParams = window.location.hash?.slice(1);
    if(hashParams){
        let searchParams = new URLSearchParams(hashParams);
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
        } else {
            select.value = "Syllabetical";
        }
    } else {
        select.value = "Syllabetical";
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
            searchParams.set("predefined", ev.target.value);
            searchParams.delete("specification");
            setParamState(undefined, "#" + searchParams.toString());
        }
    });
});

document.getElementById("refresh-sample").addEventListener("click", () => {
    if(!window.states){
        return;
    }
    document.getElementById("sample-output").innerText = passgen.generatePassword(window.states, 1000);
});

document.getElementById("desired-bits").addEventListener("input", async function adjustLengthBasedOnDesiredBits(ev){
    if(!window.states || isNaN(ev.target.value)){
        return;
    }
    let desiredBits = parseInt(ev.target.value);
    let {entropy, byLength} = window.states.entropy;
    let lastLength = byLength[byLength.length-1];
    let desiredLength = lastLength > desiredBits ?
        byLength.findIndex(ent => ent >= desiredBits) + 1
        : byLength.length + Math.ceil((desiredBits-lastLength)/entropy);
    document.getElementById("desired-length").value = desiredLength;
    await generateGenerator();
});

document.getElementById("desired-length").addEventListener("input", async function adjustEntropyBasedOnDesiredLength(ev){
    if(!window.states || isNaN(ev.target.value)){
        return;
    }
    let desiredLength = parseInt(ev.target.value);
    let {entropy, byLength} = window.states.entropy;
    let desiredBits = byLength[Math.min(byLength.length-1,desiredLength-1)];
    if(byLength.length < desiredLength){
        desiredBits += entropy * (desiredLength - byLength.length);
    }
    if(desiredBits < 0 ){
        desiredBits = Infinity;
    }
    document.getElementById("desired-bits").value = desiredBits.toFixed(2);
    await generateGenerator();
});

async function generateGenerator(){
    let desiredLength = parseInt(document.getElementById("desired-length").value);
    let options = {
        desiredLength: isNaN(desiredLength) || desiredLength <= 0 ? 16 : desiredLength,
        specification: window.specification,
        showSpecification: false,
        pwa: true
    };
    let states = window.states;
    document.getElementById("gen-jsfn").value = passgen.generateGeneratorAsJSString(states, options);
    let bookmarklet = passgen.generateGeneratorAsBookmarklet(states, options);
    document.getElementById("gen-book").value = bookmarklet;
    document.getElementById("gen-book-link").href = bookmarklet;
    let html = await passgen.generateGeneratorAsHTML(states, options);
    document.getElementById("gen-html").value = html;
    var dataUri = await passgen.generateGeneratorAsDataURI(states, options);
    document.getElementById("gen-data").value = dataUri;
    document.getElementById("gen-data-link").href = dataUri;

    // let replacePage = document.getElementById("gen-html-replace-page");
    // replacePage.addEventListener("click", () => {
    //     let doc = new DOMParser().parseFromString(html, "text/html");
    //     document.head.innerHTML = doc.head.innerHTML;
    //     document.body.innerHTML = doc.body.innerHTML;
    // });
    // replacePage.removeAttribute("disabled");
}

let dotElm = document.getElementById("states-dot");
let vizElm = document.getElementById("states-viz");
button.addEventListener("click", async () => {
    let specification = window.specification = textarea.value;
    let states, labelMap;
    try {
        let parsed = passgen.parseSpecification(specification);
        states = window.states = parsed.states;
        labelMap = window.labelMap = parsed.labelMap;
    } catch(ex) {
        console.error(ex);
        document.getElementById("error-log").innerText = `Malformed Generator: \n ${ex.toString()}`;
        return;
    }
    try {
        document.getElementById("sample-output").innerText = passgen.generatePassword(states, 1000);
    } catch (ex) {
        console.error(ex);
        document.getElementById("error-log").innerText = `Password generator failed: \n ${ex.toString()}`;
        return;
    }
    document.getElementById("error-log").innerText = "";

    let {
        entropy,
        byLength,
        equivalentToStandard
    } = states.entropy = minimalEntropy(states);

    document.getElementById("entropy-bits").innerText = entropy.toFixed(2);
    document.getElementById("entropy-equiv").innerText = equivalentToStandard.toFixed(2);

    let lastLength = byLength[byLength.length-1];
    let ATTACK_SECURE_BITS = 128;
    let COLLISION_SECURE_BITS = 80;
    let attackSecureLength = lastLength > ATTACK_SECURE_BITS ?
        byLength.findIndex(ent => ent >= ATTACK_SECURE_BITS) + 1
        : byLength.length + Math.ceil((ATTACK_SECURE_BITS-lastLength)/entropy);
    let collisionSecureLength = lastLength > COLLISION_SECURE_BITS ?
        byLength.findIndex(ent => ent >= COLLISION_SECURE_BITS) + 1
        : byLength.length + Math.ceil((COLLISION_SECURE_BITS-lastLength)/entropy);
    document.getElementById("entropy-length").innerText = attackSecureLength;
    document.getElementById("desired-length").value = collisionSecureLength;
    document.getElementById("desired-bits").value = COLLISION_SECURE_BITS;

    await generateGenerator();

    dotElm.innerText = passgen.toDot(states, labelMap);
    renderVisualization();
});


const promiseLoad = loadableElement => new Promise((resolve) => loadableElement.addEventListener("load", resolve));
document.getElementById("initialize-graphviz").addEventListener("click", async (ev) => {
    if(!ev.target.getAttribute("disabled")){
        ev.target.setAttribute("disabled", "true");
        let scriptsTemplate = document.getElementById("graphviz-scripts");
        let scripts = scriptsTemplate.content.cloneNode(true);
        let loadingPromise = promiseLoad(scripts.querySelector("script"));
        document.body.append(scripts);
        await loadingPromise;
        renderVisualization();
        ev.target.remove();
    }
});
document.getElementById("initialize-katex").addEventListener("click", async (ev) => {
    if(!ev.target.getAttribute("disabled")){
        ev.target.setAttribute("disabled", "true");
        let scriptsTemplate = document.getElementById("katex-scripts");
        let scripts = scriptsTemplate.content.cloneNode(true);
        let loadingPromises = Array.from(scripts.querySelectorAll("script")).map(promiseLoad);
        document.body.append(scripts);
        await Promise.all(loadingPromises);
        window.renderMathInElement(document.querySelector(`.markdown.math`), {
            delimiters: [
                {left: "$$", right: "$$", display: true},
                {left: "$", right: "$", display: false},
            ]
        });
        ev.target.remove();
    }
});
function renderVisualization(){
    if(typeof window["@hpcc-js/wasm"] === "undefined"){
        return;
    }
    let dot = dotElm.innerText;
    if(!dot){
        vizElm.innerHTML = `<i>Generate a password generator to visualize it</i>`;
        return;
    }
    window["@hpcc-js/wasm"].graphviz.layout(dot, "svg", "dot").then(svgString => {
        vizElm.innerHTML = svgString;
    });
}
