export class CustomDOMParser {

  parseFromString(xmlString, mimeType) {
    const doc = {
      documentElement: null,
      getElementsByTagName(tagName) {
        const results = [];
        function find(nodes) {
          for (const node of nodes) {
            if (node.tagName === tagName) {
              results.push(node);
            }
            if (node.children) {
              find(node.children);
            }
          }
        }
        find(this.documentElement ? [this.documentElement] : []);
        return results;
      }
    };

    // This is the custom parsing logic
    const stack = [{ children: [] }];
    let i = 0;

    // Basic entity replacement
    xmlString = xmlString.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

    while (i < xmlString.length) {
      const char = xmlString[i];

      if (char === '<') {
        const nextChar = xmlString[i + 1];

        if (nextChar === '/') {
          // Closing tag
          const endIndex = xmlString.indexOf('>', i);
          const tagName = xmlString.substring(i + 2, endIndex);
          if (stack.length > 1) {
            const child = stack.pop();
            if (child.tagName !== tagName) {
              console.error(`Mismatched closing tag: expected ${child.tagName}, got ${tagName}`);
            }
            stack[stack.length - 1].children.push(child);
          }
          i = endIndex + 1;
        } else if (xmlString.substring(i, i + 4) === '<!--') {
          // Comment
          const endIndex = xmlString.indexOf('-->', i);
          i = endIndex + 3;
        } else {
          // Opening or self-closing tag
          const endIndex = xmlString.indexOf('>', i);
          const tagContent = xmlString.substring(i + 1, endIndex);
          const isSelfClosing = tagContent.endsWith('/');
          const tagNameMatch = tagContent.match(/^([\w:]+)/);
          if (!tagNameMatch) {
              i = endIndex + 1;
              continue;
          }
          const tagName = tagNameMatch[0];

          const element = {
            tagName: tagName,
            attributes: [],
            children: [],
            nodeType: 1, // ELEMENT_NODE
            textContent: '',
            getAttribute(name) {
              const attr = this.attributes.find(a => a.name === name);
              return attr ? attr.value : null;
            },
            querySelector(selector) {
              // Simplified querySelector that only supports tag names
              function find(nodes) {
                for (const node of nodes) {
                  if (node.tagName === selector) {
                    return node;
                  }
                  if (node.children) {
                    const result = find(node.children);
                    if (result) return result;
                  }
                }
                return null;
              }
              return find(this.children);
            }
          };

          // Parse attributes
          const attributeRegex = /([\w:]+)=\"([^\"]*)\"/g;
          let match;
          while ((match = attributeRegex.exec(tagContent)) !== null) {
            element.attributes.push({ name: match[1], value: match[2] });
          }

          if (isSelfClosing) {
            stack[stack.length - 1].children.push(element);
          } else {
            stack.push(element);
          }

          i = endIndex + 1;
        }
      } else {
        const nextTagIndex = xmlString.indexOf('<', i);
        const text = xmlString.substring(i, nextTagIndex === -1 ? undefined : nextTagIndex);

        if (text && !/^\s*$/.test(text)) {
          const parent = stack[stack.length - 1];
          const textNode = { nodeType: 3, textContent: text }; // TEXT_NODE
          parent.children.push(textNode);
        }

        if (nextTagIndex === -1) {
          break;
        } else {
          i = nextTagIndex;
        }
      }
    }

    if (stack[0].children.length > 0) {
        doc.documentElement = stack[0].children[0];
        this._calculateTextContent(doc.documentElement);
        doc.textContent = doc.documentElement.textContent;
    }

    return doc;
  }

  _calculateTextContent(node) {
    if (node.nodeType === 3) { // TEXT_NODE
      return node.textContent;
    }
    if (node.nodeType === 1) { // ELEMENT_NODE
      let text = '';
      for (const child of node.children) {
        text += this._calculateTextContent(child);
      }
      node.textContent = text;
      return text;
    }
    return '';
  }
}
