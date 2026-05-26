# Tokenizer-web
Tokenizer converts text into tokens, which are understood by the machine and so that it can find patterns

A simple tokenizer and why it matters.

Tokenization is the process of converting a sequence of text into smaller parts, known as tokens. These tokens can be single characters or even words; it break down vast stretches of text into more digestible and understandable units for machines For example, token 700 is ’ then’ in a Tokenizer trained on the Tiny Shakespeare dataset Machines understand human language by breaking it down into bite-sized pieces, which is done by a Tokenizer

UTF-8 (Unicode Transformation Format – 8-bit) is a standard for encoding text in computers. It allows you to represent any character in the Unicode standard using one or more bytes.

So by using Byte-pair encoding, which is just replacing the most common pair of two consecutive tokens with a new token

E.g. take aaabdaaabac

The byte pair “aa” occurs most often, so it will be replaced by a byte that is not used in the data, such as “Z”. Now, there is the following data and replacement table:

ZabdZabac Z=aa

Then the process is repeated with the byte pair “ab”, replacing it with “Y”:

ZYdZYac Y=ab Z=aa

The only literal byte pair left occurs only once, and the encoding might stop here. Alternatively, the process could continue with recursive byte-pair encoding, replacing “ZY” with “X”:

XdXac X=ZY Y=ab Z=aa

So in this example, the original string aaabdaaabac had 11 characters, each treated as a separate token initially. After applying Byte Pair Encoding, it was reduced to just 5 tokens, showing how BPE compresses the input by merging frequent patterns.

We want to decrease the number of tokens per sentence, as Language models have token limits So if we have fewer tokens per sentence, we can fit more content into the model, and as there are fewer tokens, there is faster processing for any text.

What I did was convert the tiny Shakespeare dataset into tokens using UTF-8 encoding, and then, using byte-pair encoding, I took the top 10 most frequent token pairs and replaced them with new tokens, through which the number of tokens that were 256 (ASCII) became 3349.

The result was tiny Shakespeare, which has 1,115,394 characters, was turned into 386,452 tokens after using replacing the old tokens with merged tokens

After that, using the Cursor assistant, I made it a webpage and hosted it using GitHub Pages
You can try it Here
