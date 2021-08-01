/**
 * Union of a list of sets.
 * @param {...Set} sets - The list of sets to union
 * @returns {Set}
 */
export function setUnion(...sets){
    return new Set(sets.flatMap(set => Array.from(set)));
}

/**
 * Subtracts `setB` from `setA`
 * @param {Set} setA - The set to substract from
 * @param {Set} setB - The subtracting set
 * @returns {Set}
 */
export function setSub(setA, setB){
    let setC = new Set(setA);
    for(let b of setB){
        setC.delete(b);
    }
    return setC;
}

/**
 * Intersect two sets.
 * @param {Set} setA
 * @param {Set} setB
 * @returns {Set}
 */
export function setIntersect(setA, setB){
    let intersection = new Set();
    let [small, large] = setA.size < setB.size ? [setA, setB] : [setB, setA];
    for(let entry of small){
        if(large.has(entry)){
            intersection.add(entry);
        }
    }
    return intersection;
}

/**
 * Is there *any* common elements of these sets?
 * @param {Set} setA
 * @param {Set} setB
 * @returns {boolean}
 */
export function setOverlap(setA, setB){
    let [small, large] = setA.size < setB.size ? [setA, setB] : [setB, setA];
    for(let entry of small){
        if(large.has(entry)){
            return true;
        }
    }
    return false;
}

/**
 * Test equality of sets
 * @param {Set} setA
 * @param {Set} setB
 * @returns {boolean}
 */
export function setEquals(setA, setB) {
    if(setA.size != setB.size){
        return false;
    }
    for(let a of setA){
        if(!setB.has(a)){
            return false;
        }
    }
    return true;
}

/**
 * Is `setA` a (proper) subset of `setB`?
 * @param {Set} setA "The subset"
 * @param {Set} setB "The superset"
 * @param {boolean=false} proper "Proper subsets excludes equality"
 * @returns {boolean}
 */
export function setSubset(setA, setB, proper=false) {
    if(proper ? setA.size >= setB.size : setA.size > setB.size){
        return false;
    }
    for(let a of setA){
        if(!setB.has(a)){
            return false;
        }
    }
    return true;
}

/**
 * Splits `setA` and `setB` into their union, intersection, `left` (only in setA), and `right` (only in setB)
 * @param {Set} setA
 * @param {Set} setB
 * @returns {{
 *      intersection: Set,
 *      union: Set
 *      left: Set
 *      right: Set
 * }}
 */
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

/**
 * Helper-function to initialize a map entry if it doesn't exist yet.
 * @template Key
 * @template Value
 * @param {Map<Key,Value>} map
 * @param {Key} key
 * @param {Value} defaultValue
 * @param {function(Value,Key,Map<Key,Value>): Value} then
 * @return {Value}
 */
export function mapCompute(map, key, defaultValue, then){
    let value;
    if(!map.has(key)){
        value = defaultValue;
        map.set(key, value);
    } else value = map.get(key);
    return then(value, key, map);
}


/**
 * Helper-function to define an appropriate label for a given set based on the labels of other sets.
 * In general, the name will be on the form `(set_0 U set_1 U ... U set_N) - set_{N+1} - set_{N+2} ... - set_{M}`.
 * Some basic rearrangement is done to try minimalize the number of sets, but there might be a more optimal way.
 * 
 * @param {Set} set The set to label
 * @param {Array<Set>} setList A list of sets from which the set can be contructed.
 * @param {Map<Set,string>} labelMap A mapping between sets of setList and their labels.
 * @return {string} Label which identifies a construction of `set` from `setList`
 */
function getConstructionLabel(set, setList, labelMap) {
    let supersets = [];
    let antisets = [];
    for(let otherSet of setList) {
        if(setEquals(set, otherSet)){
            supersets = [otherSet];
            antisets = [];
            break;
        } else if(setSubset(set, otherSet)){
            supersets.push(otherSet);
        } else if(!setOverlap(set, otherSet)){
            antisets.push(otherSet);
        }
    }
    supersets.sort((a,b) => a.size - b.size);
    let current = supersets[0];
    let shortSupersetList = [current];
    for(let i = 1; i < supersets.length; i++){
        let intersection = setIntersect(current, supersets[i]); 
        if(current.size !== intersection.size){
            shortSupersetList.push(supersets[i]);
            current = intersection;
        }
    }
    let relevantAntisets = antisets.filter(set => setOverlap(set, current)).map(set => {
        let intersection = setIntersect(set, current);
        return {set, intersection, overlap: intersection.size};
    }).sort((a,b) => b.overlap - a.overlap);
    let shortAntisetList = [];
    for(let {set, intersection} of relevantAntisets){
        let subtraction = setSub(current, intersection);
        if(subtraction.size < current.size){
            current = subtraction;
            shortAntisetList.push(set);
        }
    }
    console.log(set, shortSupersetList, shortAntisetList, labelMap);
    let unionLabel = shortSupersetList.map(set => labelMap.get(set)).join(" U ");
    let excludeLabel = shortAntisetList.map(set => " - " + labelMap.get(set)).join("");
    return `${unionLabel}${excludeLabel}`;

}


/**
 * Computes the disjoint subsets of a list of sets.
 * Returns:
 * - The superset `domain` containing all set elements,
 * - The set of disjoint subsets `disjointSets`
 * - The map from the initial sets to a set of their disjoint subsets
 * - An updated labelMap with names representing their (possible) origins in terms of intersections and subtractions.
 * @template A
 * @param {Array<Set<A>>} setList List of sets
 * @param {Map<Set<A>,string>} [labelMap] Map from known sets to their labels
 * @return {{
 *  domain: Set<A>,
 *  setMap: Map<Set<A>,Set<Set<A>>>,
 *  disjointSets: Set<Set<A>>,
 *  labelMap: ?Map<Set<A>,string>
 * }}
 */
export function makeSetsDisjoint(setList, labelMap){
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
    if(labelMap){
        let newLabelMap = new Map(labelMap);
        for(let set of disjointSets) {
            let constructionLabel = getConstructionLabel(set, setList, labelMap);
            newLabelMap.set(set, constructionLabel);
        }
        labelMap = newLabelMap;
    }
    setMap.set(domain, disjointSets);
    return {
        domain,
        setMap,
        disjointSets,
        labelMap
    };
}
