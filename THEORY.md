
# Entropy of Password Generators

## TL;DR

The entropy in use is [min-entropy](https://en.wikipedia.org/wiki/Min-entropy), giving a pessimistic measure of the entropy which is [the desired outcome for security and cryptographic concerns](https://eprint.iacr.org/2011/659.pdf)

> :warning: The following is a personal exploration around the theory of entropy and should probably not be cited directly.

1. [Entropy of Standard Password Generators](#Entropy-of-Standard-Password-Generators)
2. [Entropy of Stateful Password Generators](#Entropy-of-Stateful-Password-Generators)
3. [Entropy of Non-Irreducible Password Generators](#Entropy-of-Non-Irreducible-Password-Generators)
4. [Entropy of Potentially Non-Uniform Password Generators](#Entropy-of-Potentially-Non-Uniform-Password-Generators)
5. [Entropy of Stochastic Password Generators](#Entropy-of-Stochastic-Password-Generators)
6. [Entropy of Obscure Password Generators](#Entropy-of-Obscure-Password-Generators)

## Entropy of Standard Password Generators

A perfect adversary knows exactly how you generated your password, even how the random numbers were generated up to and including the time of day, mac-address of your machine, and the sensory input of your mouse. They are only limited by the rate which they can attempt different passwords.

The standard secure password generators would use an alphabet $\mathcal{A} = \{a,b,c...\}$ with uniform probability of each letter, and a cryptographically secure random number generator. The adversary knows your password has $n$ letters, and so they have $B_n = |\mathcal{A}|^n$ different passwords to try and no additional hints to judge which is more likely.

With a password generator $G_{\mathcal{A}}$, the number of possibilities $B_n$ tend to grow exponentially with regards to the password-length $n$, and the base of this exponential growth then gives a measure of the _entropy_. In particular, the entropy is usually defined as relative to base 2, so that the exponential growth can be written in the form $2^{cn}$ for some $c$. This $c$ is then the _bits of entropy_ inherent in the generator, which we will denote as $h(G_\mathcal{A})$ (historical note: _h_ is for entropy, due to capital _eta_ being written $\Eta$, which looks similar to latin _H_)

$$h(G_\mathcal{A}) = \lim_{n\to\infty} \frac{1}{n} \log_2 B_n = \log_2 |\mathcal{A}|$$

Thus the entropy of a standard password generators can be considered wholly dependent upon the number of letters available.

Now, how many attempts do they have to try before it starts becoming more likely that they have succeeded than not? They have chosen an optimal sequence of guesses, $\{g_1, g_2, g_3, ..., g_{B_n}\}$, so the number of guesses they had to make if the right password was $g_i$ is then $G_{g_i}=i$. The expected number of guesses before they succeed guessing your password $X$ is then

$$E(G_X) = \sum_{i=1}^{B_n} P(X = g_i) E(G_X | X = g_i) = \frac{1}{B_n}\sum_{i=1}^{B_n}i = \frac{B_n + 1}{2}$$

They are expected to try at least half the possible passwords before they succeed. Written in terms of the entropy, the formula then becomes

$$ E(G_X) = \frac{2^{h(G_\mathcal{A})n} + 1}{2} > 2^{h(G_\mathcal{A})n - 1} $$

Note that this method of calculating expected guesses only holds for password generators with a uniform probability.


## Entropy of Stateful Password Generators

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

[Perron-Frobenius Theory][4.2.3] tells us that any irreducible matrix $A \neq 0$ have a perron-eigenvalue $\lambda_A > 0$ such that any other eigenvalue $\mu$, $|\mu| \leq \lambda_A$.

Furthermore, [an unnamed theorem][4.3.3] tells us that for any irreducible _right resolving_ graph $G$ with adjancency matrix $A$, we have that

$$ h(G) = \log_2 \lambda_A $$

A _right resolving_ graph is a graph with labeled edges, in which all edges out of a given vertex have different labels. [A different theorem][3.3.2] actually tells us that all "password generators of finite memory" (also known as _sofic shifts_) can be represented with a right resolving graph.

The password generators that we can generate with the the specification format as of the time of writing, belong to an even more restrictive class of shifts, namely _shifts of finite type_ (SFT). These are the spaces that have a finite set of "forbidden" sequences, and our current `window`-condition for state change naturally generates such a set. This gives us an easier condition, as [for an irreducible graph $G$ (with adjacency matrix $A_G$) representing a SFT, we have $h(G) = \log_2 \lambda_{A_G}$][4.3.1].


Now the question remains to make our password generators be irreducible, and the entropy is can be easily calculated.

## Entropy of Non-Irreducible Password Generators

* Breaking down a non-irreducible password generator $A$ into irreducible components $A_i$
* Theorems showing that $\lambda_A = \max_i \lambda_{A_i}$, and that $h(G_A) = \lambda_A$ still holds for _shifts_ in particular
* Arguing that for password generators in particular, being finite, the entropy is much more affected by the initial state than any infinitely running shift. 
* Consider introducing "run-length" dependent entropy for password generators, because the shift-entropy is "infinite run-length". 


## Entropy of Potentially Non-Uniform Password Generators

We have now mostly dealt with entropy of password generators as if they are always equal to the entropy of the shift space from which the passwords are gathered. This is not necessarily the case, and must be investigated. 

In particular, a difference between shifts and password generators is that shifts concerns themselves mostly about which (infinite) sequences are possible, while password generators need to think about which (finite) sequences are probable. While we can calculate a measure of entropy based on the number of passwords generated $B_n$, it would be more helpful to calculate the entropy as it changes for each transition between the states, how much _information_ is added by each step. This would allow us to expand our definition of entropy into non-uniform probabilities of passwords.

Based on the work of [Claude Shannon](https://en.wikipedia.org/wiki/Claude_Shannon) there is generally four axioms that encompass what it means to measure the information value $I$ of an event. [To quote Wikipedia](https://en.wikipedia.org/wiki/Entropy_(information_theory)#cite_note-10)

>
>
> 1. $I(p)$ is monotonically decreasing in p: an increase in the probability of an event decreases the information from an observed event, and vice versa.
>
> 2. $I(p) \geq 0$: information is a non-negative quantity.
>
> 3. $I(1) = 0$: events that always occur do not communicate information.
>
> 4. $I(p1, p2) = I(p1) + I(p2)$: the information learned from independent events is the sum of the information learned from each event.
>
> ...
>
> Shannon discovered that a suitable choice of $I$ is given by:
>
>   $$I(p) = \log(\frac{1}{p}) = -\log(p)$$
>
> In fact, the only possible values of I are $I(u) = k\log u$ for $k<0$.
>

In particular,  entropy $\Eta$ is generally defined as the _expected value_ of information content, which using this formula gives us:

$$ \Eta(X) = E[I(X)] = - \sum_{x_i\in X} P(x_i)I(x_i) = - \sum_{x_i\in X} P(x_i)\log_b(P(x_i)) $$

The log-base $b$ is usually chosen as $2$, giving us _bits of entropy_.

We may also show that this definition is consistent with our earlier definition of entropy $\lim_{n\to\infty} \frac{1}{n} \log_2 B_n$ for certain groups of generators. Given a password generator $G$, the probability for a given password $p$ of length $n$ is $1/B_n$, which gives us:

$$ \Eta(G_n) = - \sum_{p\in G_n} \frac{1}{B_n}\log_2(\frac{1}{B_n}) = \log_b{B_n} $$

Therefore the entropy "per character" in the generator goes to $h(G)$ as $n\to\infty$. As long as we have _right resolving_ matrices, with uniform probability between the edges, each password of a given length remains of uniform probability and we can continue to use $\lambda_A$ to calculate the entropy as the two definitions coincide. This new definition gives us a way to adjust the probabilities of edges while still being able to judge entropy, as well as feel more certain in calculating the entropy of $n$-length passwords using $B_n = \Sigma_{ij} A^n_{ij}$


## Entropy of Stochastic Password Generators

A syllabetical password generator is readable and pronouncible, and generally just fine, but what if we want more? What if instead we want to base our passwords around bigrams, in which the edges are purposely _non-uniform_ in their distribution? Perhaps we have a strong preference for the vowel `a` as opposed to `y`? Now let's introduce probability to our edges, and explore how that affects the entropy.

There is established theory about this if we turn to Markov models, but they concern themselve smostly with the probability of the destination, and not the manner in which you arrive, and so we need to modify our graph in a particular manner. But first, let's ensure we all are operating on the definition and notation.

A topological Markov chain is a pair $(P,\pi)$ of a _stochastic transition matrix_ $P$ and its _stationary probability vector_ $\pi$, that is _compatible_ with a given _shift of finite type_ (ie. $\pi_{ij} = 0$ whenever $A_{ij} = 0$).


In the earlier sections, we defined the [topological entropy](https://en.wikipedia.org/wiki/Topological_entropy) on subshifts  measuring variety, and the Shannon entropy on uncertain events measuring information content. For Markov models in general it more common to operate with the [Kolmogorov-Sinai entropy](https://en.wikipedia.org/wiki/Measure-preserving_dynamical_system#Measure-theoretic_entropy) of the [Markov measure](https://en.wikipedia.org/wiki/Subshift_of_finite_type#Measure), but we are in a cryptographical context, and so there is another entropy that might be of more interest: `min-entropy`.

In a cryptographical context we are more concerned about being _secure_ rather than _right_, and so the `min-entropy` can give us a better baseline on which we can build our tolerances for insecurity.

The general definition of min-entropy is not as useful to us:

$$ H_\infty(p) = - \log_2 max_x p (x) = min_x (-\log_2 p(x)) $$ 

This would require iterating over all possible passwords, but for Markov models, [there is a better way](https://eprint.iacr.org/2011/659.pdf):

$$ H_\infty((\pi,P)_n) = -\log_2\left(\pi\odot \underbrace{P\odot P \odot ... \odot P}_{n-1} \odot \vec 1 \right) $$

Here $\odot$ is defined as a matrix multiplication, but reducing the dot-product with $\max$ instead of $\sum$, and $\vec 1_i = 1$ for all $i$.

Now the only remaining problem is that this is defined for "proper" markov models, but for computational simplicity the password generator this page is written for is based around the concept of "emission sets". With $(G, A)$ be our right resolving graph and associated adjacency matrix for our model, with edge-labels in $\mathcal A$. We define the emission sets of $\mathbb A_i$ as the disjoint sets $A_{i,x} \subset \mathcal{A_{i}}$ such that any label $\alpha_x\in A_{i,x}$ have the same probability $p_x$ and ends up in the same state $j_x$. We state $A_{ij,x}\subset \mathcal A_{ij}$ for the subsets ending in j

Let $K_ij$ be the set of states in which both $A_{ik}\neq 0$ and $A_{kj}\neq 0$

$$
\begin{array}{rl}
    H_{i\to_2j} &= -\max_{k\in K_{ij},x\in A_{ik},y\in A_{kj}} \log_2 (p_{i,x}p_{k,y}) \\
    &= -\max_{k\in K_{ij}} \max_{x\in A_{ik}} \log_2 p_{i,x} + \max_{y\in A_{kj}} \log_2 p_{k,y} \\
    &= -\max_{k\in K_{ij}} (\max_{A_x\subset \mathcal A_{ik}} \log_2 p_x + \max_{A_y\subset \mathcal A_{kj}} \log_2 p_y)
\end{array}
$$

Let's define $M_{ij} = \max_{x\in A_{ij}} p_x$.

$$
\begin{array}{rl}
(M\odot M)_{ij}
    &= \max_{k\in K_{ij}} M_{ik}M_{kj}\\ 
    &= \max_{k\in K_{ij}} \max_{x\in A_{ik}} p_{i,x} \max_{x\in A_{kj}} p_{k,y}\\ 
    &= \max_{k\in K_{ij},x\in A_{ik},y\in A_{kj}} p_{i,x}p_{k,y}
\end{array}
$$

Which gives us $H_{i\to_2j} = -\log_2 M^2_{ij}$. And more in general $H_{ij}(G_n) = (\underbrace{M\odot M \odot ... \odot M}_{n})_{ij}$.

To get our actual entropy we need to have the probability of the initial positions, which for a proper Markov model would be $\pi$. However, since we are using this as a password generator, the "true" initial position is the actual initial position used. In particular, this currently is a rather simple $v_i = \frac{1}{N}$ where $N$ is the number of states. Thus, our result ends as


$$ H_{\tilde\infty}(G_n) = - \log_2 v\odot (\underbrace{M\odot M \odot ... \odot M}_{n})\odot u \leq H_t(G_n)$$

Now this can be more easily worked with, and requires somewhere around $O(N^3n)$ operations to calculate.

<!-- 

NOTE: The following commented sections are just my personal exploring of the subjects, turning out in dead ends. They are likely to be removed if I feel they have no personal value for my own development.


...

Consider an entropy matrix $H_{ij} = H(G_{i\to j})$, as in, the entropy generated when going from state i to state j. Let $\mathcal A_{ij}$ be the different edges from state $i$ to $j$, and let us create a set of disjoint sets $\mathbb A_{ij} = \{A_{x,ij}\}_x^n$ where $A_{x,ij} \subset \mathcal{A_{ij}}$ each with a probability for emission $p_{A_{x,ij}}$. The entropy between the states becomes.

$$ H_{ij} = -\sum_{\alpha \in \mathcal A_{ij}} P(\alpha; i)\log_2(P(\alpha; i))  = \sum_{A_{x,ij} \in \mathbb A_{ij}} |A_{x,ij}|p_{A_{x,ij}}\log_2(p_{A_{x,ij}})$$

Two unrelated paths $i\to a\to j$ and $i\to b\to j$ from $i$ to $j$ are independent, and the entropy of 

$$H(G_{i\to\{a,b\}\to j}) = H_{ia} + H_{aj} $$

If we have a right-resolving graph, then $i \to a$ and $a \to j$ generate _almost_ independent entropy. The problem is that if either $H_{ia} = 0$ or $H_{aj} = 0$, then $H(G_{i\to a \to j}) = 0$, and we lose our nice properties.

Let's instead consider the proto-entropy matrix which is $M_{ij} = 2^{H_{ij}}$ when $H_{ij} \neq 0$, but $0$ otherwise. With this matrix we can return to our matrix multiplication formula:

$$(M^2)_{ij} = \sum_k 2^{H_{ik} + H_{kj}}$$

Let's undo our exponential operation

$$\log_2 M^2_{ij} = \log_2 \sum_k M_{ik}M_{kj} \leq H_{ik} + H_{kj} $$


This does not work as I want it to....

*to be continued*

.....


Before I started working on the exact theory of these stochastic password generators, I had a "feeling" that the following might work:

Let $\mathcal A_{ij}$ be the different edges from state $i$ to $j$, and let us create a set of disjoint sets $\mathbb A_{ij} = \{A_{x,ij}\}_x^n$ where $A_{x,ij} \subset \mathcal{A_{ij}}$ each with a probability for emission $p_{A_{x,ij}}$. Let us consider "normalized weight" per emission as 

$$w_{x,ij} = \frac{p_{A_{x,ij}}}{\sum_y |A_{y,ij}|p_{A_{y,ij}}}$$

This would make the most probable character be worth 1 edge, while the least probable character would be a less than one edge, compared to the uniformly distributed edges.

We can then create a "normalized" adjacency matrix $M_{ij} = \sum_x w_{x,ij}$, and the regular techniques that work on a uniform adjacency matrix should work approximately well here.

Whether this is true, is yet to be investigated properly.


....


The min-entropy can be used as-is if we instead work in a non-square matrix $R$, with one columns for each distinct state emission $i_e$ and one row for each distinct state-absorption $j_a$. The values $R_{i_ej_a}$ is the probability that that state $j$ emits $e$ (and therefore lands in state $i$ due to the right resolvedness of the underlying graph).

$$
\begin{array}{rcl}
    &  \begin{array}{c}  i \  \  \  \  \  \  \  \  \ j \  \  \  \  \  \  \  \  \ k \end{array} \\
    \begin{matrix}
        i\\
        j\\
        k
    \end{matrix}
    \hspace{-1em}
    & \begin{pmatrix}
        0 & \{a,b\} & 0 \\
        \{c\} & 0 & \{d\} \\
        \{d\} & \{a,b\} & 0
      \end{pmatrix}
\end{array}

\to


\begin{array}{rcl}
    &  \begin{array}{c}  i_a \ \  \ \  \ \ i_b \ \  \ \  \ \ j_c \ \  \ \  \ \ j_d \ \  \ \  \ \ k_a \ \  \ \  \ \ k_b \ \  \ \  \ \ k_d \end{array} \\
    \begin{matrix}
        i_c\\
        i_d\\
        j_a\\
        j_b\\
        k_d\\
    \end{matrix}
    \hspace{-1em}
    & \begin{pmatrix}
        0       & 0         & p_{j,c} & p_{j,c} & 0         & 0         & 0\\ 
        0       & 0         & 0       & 0       & p_{k,d}   & p_{k,d}   & p_{k,d}\\ 
        p_{i,a} & p_{i,a}   & 0       & 0       & p_{k,a}   & p_{k,a}   & p_{k,a}\\ 
        p_{i,b} & p_{i,b}   & 0       & 0       & p_{k,b}   & p_{k,b}   & p_{k,b}\\ 
        0       & 0         & p_{j,d} & p_{j,d} & 0         & 0         & 0\\ 
      \end{pmatrix}
\end{array}

$$
(Note: I believe made this matrix transposed in relation to the usual stochastic matrices: the columns sum to zero, and not the rows.)
Instead, maybe custom min bound on entropy...
H_{ij} as min-entropy going from i to j.
$$ H_{ij} = -\max_x log_2(p_x)$$

----
-->


## Entropy of Obscure Password Generators

While non-standard password generators generally reduces the entropy, and _security by obscurity_ is not generally considered _security_ at all, it often feels that as long as nobody targets *you* specifically, a custom generator has a virtual increase in entropy. **This is not the case**. Ultimately, the only secure password is one with sufficiently high entropy. One should always strive to avoid any password that has ever been used before, ever. The reason being, at some point a previously used password is going to turn up in a password-leak, and thus be among the first attempted by an automated attacker. A password should strive to be *universally unique*.

Assume that every person ever has created one new (universally unique) password every millisecond for the duration of their lifetime. We want there to be virtually no chance that our generators generate any of these passwords. We have approximately $10^{10}$ people, and and a conservative upper bound of $1000\cdot60\cdot60\cdot24\cdot365\cdot88 = 2.8\cdot 10^{12}$ passwords generated by each person.

Therefore, if all $10^{22}$ passwords were generated with our obscure password generator, we want there to be virtually no chance of any collision what-so-ever. How much entropy do we then need? Well, it depends on what one considers 'virtually no chance', but for sake of argument let's use a winning the lottery. That is, our password generator is "sufficiently secure" if the chance for there being any collision whatsoever is similar to winning a state-lottery, which is about $10^{-7}$

... todo: calculate a proper expression of entropy limits for secure passwords given the above variables.



[4.2.3]: https://faculty.washington.edu/lind/symbolic-book/
[4.3.3]: https://faculty.washington.edu/lind/symbolic-book/
[3.3.2]: https://faculty.washington.edu/lind/symbolic-book/
[4.3.1]: https://faculty.washington.edu/lind/symbolic-book/
