

export function createIconSVGDataURI(passwordSample){
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("version", "1.1");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("width", "256");
    svg.setAttribute("height", "256");
    let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M 0 50 C 0 0 0 0 50 0 S 100 0 100 50 100 100 50 100 0 100 0 50");
    path.setAttribute("style", "fill: #222");
    svg.appendChild(path);
    let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("font-size", "18");
    g.setAttribute("font-weight", "bolder");
    g.setAttribute("fill", "#fff");
    g.setAttribute("dominant-baseline", "middle");
    g.setAttribute("text-anchor", "middle");
    let i = 0;
    for(let y = 0; y < 6; y++){
        for(let x = 0; x < 6; x++){
            let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.innerHTML = passwordSample[i++];
            text.setAttribute("x", 20 * x);
            text.setAttribute("y", 20 * y);
            if(x === 0 || x === 5 || y === 0 || y === 5){
                text.setAttribute("fill", "#fff6");
            } else if(x === 1 || x === 4 || y === 1 || y === 4){
                text.setAttribute("fill", "#fffb");
            }
            g.appendChild(text);
        }
    }
    svg.appendChild(g);
    return `data:image/svg+xml;base64,${btoa(svg.outerHTML)}`;
}

export async function createIconPNGDataURI(iconSVGDataURI){
    let canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    let context = canvas.getContext("2d");
    context.clearRect(0,0,256,256);
    return await new Promise((resolve, reject) => {
        let img = new Image();
        img.onload = function() {
            context.drawImage(img, 0, 0);
            resolve(canvas.toDataURL());
        };
        img.onerror = function(err){
            console.log("err", err);
            reject(err);
        };
        img.src = iconSVGDataURI;
    });
}
export function createManifestDataURI(){
    let manifest = {
        name: 'Password Generator',
        short_name: 'Password',
        display: 'standalone',
        background_color: '#222',
        theme_color: '#FFF'
    };
    return `data:application/manifest+json;${encodeURI(JSON.stringify(manifest))}`;
}
