
export function setUnion(...sets){
    return new Set(sets.flatMap(set => Array.from(set)));
}
export function setSub(setA,setB){
    let setC = new Set(setA);
    for(let b of setB){
        setC.delete(b);
    }
    return setC;
}
export function setIntersect(setA,setB){
    let intersection = new Set();
    let [small, large] = setA.size < setB.size ? [setA, setB] : [setB, setA];
    for(let entry of small){
        if(large.has(entry)){
            intersection.add(entry);
        }
    }
    return intersection;
}
export function setOverlap(setA, setB){
    let [small, large] = setA.size < setB.size ? [setA, setB] : [setB, setA];
    for(let entry of small){
        if(large.has(entry)){
            return true;
        }
    }
    return false;
}
export function setSplit(setA, setB){
    let left = new Set();
    let right = new Set();
    let intersection = new Set();
    let union = new Set(setA, setB);
    for(let entry of union){
        let inA = setA.has(entry);
        let inB = setB.has(entry);
        if(inA && inB){
            intersection.add(entry);
        } else if(inA){
            left.add(entry);
        } else {
            right.add(entry);
        }
    }
    return {left, right, intersection, union};
}

export function mapCompute(map, key, defaultValue, then){
    let value;
    if(!map.has(key)){
        value = defaultValue;
        map.set(key, value);
    } else value = map.get(key);
    return then(value, key, map);
}


export function makeSetsDisjoint(setList){
    let domain = setUnion(...setList);
    let signatureMap = new Map();
    let setMap = new Map();
    for(let token of domain){
        let inclusionList = setList.map(set => set.has(token));
        let signature = JSON.stringify(inclusionList);
        let tokenSet = mapCompute(signatureMap, signature, new Set(), set => set.add(token));
        for(let i = 0; i < inclusionList.length; i++){
            if(inclusionList[i]){
                mapCompute(setMap, setList[i], new Set(), set => set.add(tokenSet));
            }
        }
    }
    let disjointSets = new Set(signatureMap.values());
    setMap.set(domain, disjointSets);
    return {
        domain,
        setMap,
        disjointSets
    }
}
