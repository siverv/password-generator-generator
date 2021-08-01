// BASED ON: https://dev.to/ndesmic/how-to-make-a-tab-control-with-web-components-57on

function setParamState(searchParams=location.search, hashParams=location.hash){
    if(searchParams?.[0] !== "?"){
        searchParams = "?" + searchParams;
    }
    if(hashParams?.[0] !== "#"){
        hashParams = "#" + hashParams;
    }
    window.history.replaceState(null, null, searchParams + hashParams)
}

class WcTabPanel extends HTMLElement {
    static observedAttributes = ["selected-index", "direction"];
    _selectedIndex = 0;
    _direction = "row";
    constructor() {
        super();
        this.bind(this);
    }
    bind(element) {
        element.render = element.render.bind(element);
        element.attachEvents = element.attachEvents.bind(element);
        element.cacheDom = element.cacheDom.bind(element);
        element.onTabClick = element.onTabClick.bind(element);
        element.selectTabByIndex = element.selectTabByIndex.bind(element);
        element.onContentSlotChange = element.onContentSlotChange.bind(element);
        element.onTabSlotChange = element.onTabSlotChange.bind(element);
    }
    connectedCallback() {
        this.render();
        this.cacheDom();
        this.attachEvents();
        this.findInitialSelectedIndex();
    }
    findInitialSelectedIndex(){
        this.searchParamField = this.getAttribute("search-param");
        if(this.searchParamField && location.search){
            let searchParams = new URLSearchParams(location.search);
            if(searchParams.has(this.searchParamField)){
                let value = searchParams.get(this.searchParamField);
                if(value != null && !isNaN(value)){
                    this._selectedIndex = parseInt(value);
                    return;
                }
            }
        }
        let value = this.getAttribute("selectedIndex");
        if(value != null && !isNaN(value)){
            this._selectedIndex = parseInt(value);
            return;
        }
    }
    render() {
        this.shadow = this.attachShadow({ mode: "open" });
        this.shadow.innerHTML = `
                <style>
                    :host { display: flex; flex-direction: column; }
                    :host([direction="column"]) { flex-direction: row; }
                    :host([direction="column"]) .tabs { flex-direction: column; }
                    .tabs { display: flex; flex-direction: row; flex-wrap: nowrap; gap: var(--tab-gap, 0px); }
                    
                    .tabs ::slotted(*) { padding: 5px; border: 1px solid #ccc; user-select: none; cursor: pointer; }
                    .tabs ::slotted(.selected) { background: #efefef; }
                    .tab-contents ::slotted(:not(.selected)) { display: none!important; }
                    .tab-contents ::slotted(.selected) { padding: 5px; }
                </style>
                <div class="tabs" tabindex="0">
                    <slot id="tab-slot" name="tab"></slot>
                </div>
                <div class="tab-contents">
                    <slot id="content-slot" name="content"></slot>
                </div>
            `;
        let tabs = this.shadow.querySelector(".tabs");
        tabs.addEventListener("keydown", event => {
            if (!event.getModifierState("Control") &&
                !event.getModifierState("Alt") &&
                !event.getModifierState("Meta")){
                    switch(event.key){
                        case 'ArrowLeft':
                            this.selectTabByIndex(this.selectedIndex - 1);
                            return;
                        case 'ArrowRight':
                            this.selectTabByIndex(this.selectedIndex + 1);
                            return;
                    }
            }
        })
    }
    cacheDom() {
        this.dom = {
            tabSlot: this.shadow.querySelector("#tab-slot"),
            contentSlot: this.shadow.querySelector("#content-slot")
        };
        this.dom.tabs = this.dom.tabSlot.assignedElements();
        this.dom.contents = this.dom.contentSlot.assignedElements();
    }
    attachEvents() {
        this.dom.tabSlot.addEventListener("click", this.onTabClick);
        this.dom.tabSlot.addEventListener("slotchange", this.onTabSlotChange);
        this.dom.contentSlot.addEventListener("slotchange", this.onContentSlotChange);
    }
    initializedSelectedTabSlot = false;
    onTabSlotChange(){
        this.dom.tabs = this.dom.tabSlot.assignedElements();
        if(!this.initializedSelectedTabSlot && this.dom.tabs[this._selectedIndex]){
            this.dom.tabs[this._selectedIndex]?.classList.add("selected");
            this.initializedSelectedTabSlot = true;
        }
    }
    initializedSelectedContentSlot = false;
    onContentSlotChange(){
        this.dom.contents = this.dom.contentSlot.assignedElements();
        if(!this.initializedSelectedContentSlot && this.dom.contents[this._selectedIndex]){
            this.dom.contents[this._selectedIndex]?.classList.add("selected");
            this.initializedSelectedContentSlot = true;
        }
    }
    onTabClick(e) {
        const target = e.target;
        if (target.slot === "tab") {
            const tabIndex = this.dom.tabs.indexOf(target);
            this.selectTabByIndex(tabIndex);
        }
    }
    selectTabByIndex(index) {
        this.selectedIndex = index;
        const tab = this.dom.tabs[index];
        const content = this.dom.contents[index];
        if (!tab || !content) return;
        this.dom.contents.forEach(p => p.classList.remove("selected"));
        this.dom.tabs.forEach(p => p.classList.remove("selected"));
        content.classList.add("selected");
        tab.classList.add("selected");
        if(this.searchParamField){
            let searchParams = new URLSearchParams(location.search);
            searchParams.set(this.searchParamField, this.selectedIndex);
            setParamState(searchParams.toString());
        }
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if(name === "selected-index"){
                this.selectedIndex = newValue;
            } else {
                this[name] = newValue;
            }
        }
    }
    set selectedIndex(value) {
        this._selectedIndex = Math.max(0, Math.min(this.dom.tabs.length, value));
    }
    get selectedIndex() {
        return this._selectedIndex;
    }
    set direction(value){
        this._direction = value;
        this.setAttribute("direction", value);
    }
    get direction(){
        return this._direction;
    }
}

customElements.define("wc-tab-panel", WcTabPanel);
