import * as vfile from 'to-vfile';
import report from 'vfile-reporter';
import {unified} from 'unified';
import remarkParse from 'remark-parse';
import rehypeParse from 'rehype-parse';
import math from 'remark-math';
import katex from 'rehype-katex';
import slug from 'remark-slug';
import gfm from 'remark-gfm';
import remark2rehype from 'remark-rehype';
import stringify from 'rehype-stringify';

const mdpipe = unified()
    .use(remarkParse)
    .use(slug)
    .use(math)
    .use(gfm)
    .use(remark2rehype)
    .use(katex);


const htmlFragmentPipe = unified()
    .use(rehypeParse, {fragment: true});


function traverseReplace(tree, replace) {
    return transform(tree, null, null);
    function transform(node, index, parent) {
        let replacement = replace(node, index, parent);
        if(replacement){
            return replacement;
        } else {
            if ('children' in node) {
                return {
                    ...node,
                    children: node.children.flatMap(
                        (child, index) => transform(child, index, node)
                    )
                };
            } return node;
        }
    }
}

function injector(tagName, processor) {
    return () => (tree) => {
        return traverseReplace(tree, (node) => {
            if(node.type === "element" && node.tagName === tagName){
                let {src} = node.properties;
                if(src){
                    let raw = processor.parse(vfile.readSync(src));
                    let hast = processor.runSync(raw);
                    if(hast.type === "root"){
                        return hast.children;
                    }
                }
            }
        });
    };
}


const buildPipe = unified()
    .use(rehypeParse)
    .use(injector("include-html", htmlFragmentPipe))
    .use(injector("include-markdown", mdpipe))
    .use(stringify);


buildPipe.process(vfile.readSync('./base.html'), function (err, file) {
    console.error(report(err || file));
    console.log(String(file));
});
