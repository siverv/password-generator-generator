
# Entropy of Standard Password Generators.

A perfect adversary knows exactly how you generated your password, even how the random numbers were generated up to and including the time of day, mac-address of your machine, and the sensory input of your mouse. They are only limited by the rate which they can attempt different passwords.

The standard secure password generators would use an alphabet $\mathcal{A} = \{a,b,c...\}$ with uniform probability of each letter, and a cryptographically secure random number generator. The adversary knows your password has $n$ letters, and so they have $B_n = |\mathcal{A}|^n$ different passwords to try and no additional hints to judge which is more likely.

With a password generator $G_{\mathcal{A}}$, the number of possibilities $B_n$ tend to grow exponentially with regards to the password-length $n$, and the base of this exponential growth then gives a measure of the _entropy_. In particular, the entropy is usually defined as relative to base 2, so that the exponential growth can be written in the form $2^{cn}$ for some $c$. This $c$ is then the _bits of entropy_ inherent in the generator, which we will denote as $h(G_\mathcal{A})$ (historical note: _h_ is for entropy, due to capital _eta_ being written _H_, which looks similar to latin _H_)

$$h(G_\mathcal{A}) = \lim_{n\to\infty} \frac{1}{n} \log_2 B_n = \log_2 |\mathcal{A}|$$

Thus the entropy of a standard password generators can be considered wholly dependent upon the number of letters available.

Now, how many attempts do they have to try before it starts becoming more likely that they have succeeded than not? They have chosen an optimal sequence of guesses, $\{g_1, g_2, g_3, ..., g_{B_n}\}$, so the number of guesses they had to make if the right password was $g_i$ is then $G_{g_i}=i$. The expected number of guesses before they succeed guessing your password $X$ is then

$$E(G_X) = \sum_{i=1}^{B_n} P(X = g_i) E(G_X | X = g_i) = \frac{1}{B_n}\sum_{i=1}^{B_n}i = \frac{B_n + 1}{2}$$

They are expected to try at least half the possible passwords before they succeed. Written in terms of the entropy, the formula then becomes

$$ E(G_X) = \frac{2^{h(G_\mathcal{A})n} + 1}{2} > 2^{h(G_\mathcal{A})n - 1} $$

Note that this method of calculating expected guesses only holds for password generators with a uniform probability.


# Entropy of Stateful Password Generators

Sometimes a perfect password generator is not perfect for _you_. Perhaps you would like a password that is easier to remember, or has a particular pattern to it. Sometimes you want _stateful_ generators that has a slight chance of a number, but never more than one at a time.

Each choice here would reduce the entropy and require longer passwords for the same amount of security, but the trade-off can be worth it. The question then is how to find the entropy of your bespoke generator so that you are not unintentionally weakening your security for convenience.

Let's say your generator has two states: `vowel` and `consonant`. In the `vowel`-state, it emits a consonant and changes the state to the `consonant`-state, and vice versa. This generator $G_\mathcal{S}$ can be visualized as a graph:

```
            aeiouy
+-------+-----------------------> +-----------+
| VOWEL |                         | CONSONANT |
+-------+ <-----------------------+-----------+
            bcdfghjklmnpqrstvwxz
            
```

This system would emit an infinite sequence of symbols `...azucumomozyhisulujewibokydacezunanubus...` and to make this a password generator, we just cut out a random section of $n$ letters. The study of such infinite sequences of symbols is a part of Symbolic Dynamics, and the space of all possible infinite sequences of a given pattern is known as a Shift Space. From the study of shift spaces, we can find a series of theorems and proposition that will help us determine the entropy of stateful password generators.

But first, let's start with our existing definition of entropy, using $B_n(G_\mathcal S)$ the number of possible passwords of length $n$:

$$ h(G_\mathcal{S}) = - \lim_{n\to\infty} \frac{1}{n}\log_2 B_n({G_\mathcal{S}}) $$

To find $B_n(G_\mathcal S)$, it can be useful to look upon the adjacency matrix of our state diagram

$$ A_{S} = \begin{bmatrix}
    0 & aeiouy \\
    bcdfghjklmnpqrstvwxz & 0
\end{bmatrix} = \begin{bmatrix}
    0 & 6 \\
    20 & 0
\end{bmatrix} $$

The number of 2-letter passwords of the starting in state $i$ and ending in state $j$ is $\sum_{k\in\mathcal S} (A_{\mathcal S})_{ik}(A_{\mathcal S})_{kj}$, otherwise known as be $(A_{\mathcal S}^2)_{ij}$. This holds in general, and $(A_{\mathcal S}^n)_{ij}$ is is excatly the number of passwords from starting in state $i$ and ending in state $j$ and so we get

$$ B_n(G_\mathcal S) = \sum_{ij} (A_\mathcal S^n)_{ij}$$


While calculating this directly is possible, there is a large amount of existing theory available for us, especially if our graph is _irreducible_. An _irreducible_ graph is one in which there exists a path starting at state $i$, ending in state $j$, for any two $i,j$. 

[Perron-Frobenius Theory](4.2.3) tells us that any irreducible matrix $A \neq 0$ have a perron-eigenvalue $\lambda_A > 0$ such that any other eigenvalue $\mu$, $|\mu| \leq \lambda_A$.

Furthermore, [an unnamed theorem](4.3.3) tells us that for any irreducible _right resolving_ graph $G$ with adjancency matrix $A$, we have that

$$ h(G) = \log_2 \lambda_A $$

A _right resolving_ graph is a graph with labeled edges, in which all edges out of a given vertex have different labels. [A different theorem](3.3.2) actually tells us that all "password generators of finite memory" (also known as _sofic shifts_) can be represented with a right resolving graph.

The password generators that we can generate with the the specification format as of the time of writing, belong to an even more restrictive class of shifts, namely _shifts of finite type_ (SFT). These are the spaces that have a finite set of "forbidden" sequences, and our current `window`-condition for state change naturally generates such a set. This gives us an easier condition, as [for an irreducible graph $G$ (with adjacency matrix $A_G$) representing a SFT, we have $h(G) = \log_2 \lambda_{A_G}$](4.3.1).


Now the question remains to make our password generators be irreducible, and the entropy is can be easily calculated.

# Entropy of Non-Irreducible Password Generators

* Breaking down a non-irreducible password generator $A$ into irreducible components $A_i$
* Theorems showing that $\lambda_A = \max_i \lambda_{A_i}$, and that $h(G_A) = \lambda_A$ still holds for _shifts_ in particular
* Arguing that for password generators in particular, being finite, the entropy is much more affected by the initial state than any infinitely running shift. 
* Consider introducing "run-length" dependent entropy for password generators, because the shift-entropy is "infinite run-length". 


# Entropy of Non-Uniform Password Generators

We have now mostly dealt with entropy of password generators as if they are always equal to the entropy of the shift space from which the passwords are gathered. This is not necessarily the case, and must be investigated. 

In particular, a difference between shifts and password generators is that shifts concerns themselves mostly about which (infinite) sequences are possible, while password generators need to think about which (finite) sequences are probable.

It might be that for any *right-resolving* graph that these are one and the same, but that needs to be seen.

# Entropy of Stochastic Password Generators

A syllabetical password generator is readable and pronouncible, and generally just fine, but what if we want more? What if instead we want to base our passwords around bigrams, in which the edges are purposely _non-uniform_ in their distribution? Let's explore!

