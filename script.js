document.addEventListener('DOMContentLoaded', () => {
    const numberInput = document.getElementById('numberInput');
    const calculateBtn = document.getElementById('calculateBtn');
    const resultContainer = document.getElementById('result');
    const sequenceOutput = document.getElementById('sequenceOutput');
    const notationOutput = document.getElementById('notationOutput');
    const texOutput = document.getElementById('texOutput');
    const tableBody = document.querySelector('#convergentsTable tbody');

    // Helper to parse "123.456" or "22/7" into { num: BigInt, den: BigInt }
    function parseInputToRational(str) {
        try {
            // Remove whitespace and normalize to lowercase for keyword checks
            str = str.trim();
            const lowerStr = str.toLowerCase();
            if (!str) return null;

            // Handle constants and functions
            let calculatedValue = null;

            if (lowerStr === 'pi') {
                calculatedValue = Math.PI;
            } else if (lowerStr === 'phi') {
                calculatedValue = (1 + Math.sqrt(5)) / 2;
            } else if (lowerStr === 'e') {
                calculatedValue = Math.E;
            } else if (lowerStr.startsWith('sqrt(') && lowerStr.endsWith(')')) {
                const inner = lowerStr.substring(5, lowerStr.length - 1);
                const val = parseFloat(inner);
                if (!isNaN(val) && val >= 0) {
                    calculatedValue = Math.sqrt(val);
                }
            }

            // If we calculated a value from a keyword, convert it to a string 
            // and let the decimal parser handle it.
            if (calculatedValue !== null) {
                str = calculatedValue.toString();
            }

            // Check for rational input "num/den"
            if (str.includes('/')) {
                const parts = str.split('/');
                if (parts.length !== 2) return null; // Invalid format (multiple slashes)
                
                const num = BigInt(parts[0].trim());
                const den = BigInt(parts[1].trim());

                if (den === 0n) throw new Error("Division by zero");

                // Normalize sign to numerator
                if (den < 0n) {
                    return { num: -num, den: -den };
                }
                return { num, den };
            }

            // Handle decimal input
            let sign = 1n;
            if (str.startsWith('-')) {
                sign = -1n;
                str = str.substring(1);
            } else if (str.startsWith('+')) {
                str = str.substring(1);
            }

            // Handle scientific notation
            if (str.toLowerCase().includes('e')) {
                 const [mantissaStr, exponentStr] = str.toLowerCase().split('e');
                 let exponent = parseInt(exponentStr);
                 if (isNaN(exponent)) return null;

                 const mantissaRational = parseInputToRational(mantissaStr);
                 if (!mantissaRational) return null;
                 
                 let { num, den } = mantissaRational;
                 
                 if (exponent > 0) {
                     num *= 10n ** BigInt(exponent);
                 } else {
                     den *= 10n ** BigInt(-exponent);
                 }
                 return { num, den };
            }

            const parts = str.split('.');
            if (parts.length > 2) return null; // Invalid format

            const integerPartStr = parts[0] || "0";
            const fractionalPartStr = parts[1] || "";

            const integerPart = BigInt(integerPartStr);
            
            // If no fraction, return integer/1
            if (fractionalPartStr === "") {
                return { num: sign * integerPart, den: 1n };
            }

            const fractionalPart = BigInt(fractionalPartStr);
            const denominator = 10n ** BigInt(fractionalPartStr.length);

            // num = integer * 10^len + fraction
            const numerator = sign * (integerPart * denominator + fractionalPart);
            
            return { num: numerator, den: denominator };
        } catch (e) {
            console.error("Parsing error", e);
            return null;
        }
    }

    // Special solver for sqrt(n) where n is integer
    function solveSqrtSequence(n) {
        const a0 = Math.floor(Math.sqrt(n));
        
        // Perfect square check
        if (a0 * a0 === n) {
            return { sequence: [BigInt(a0)], periodStartIndex: null };
        }

        // Algorithm for periodic continued fraction of sqrt(n)
        // m0 = 0, d0 = 1, a0 = sqrt(n)
        let m = 0;
        let d = 1;
        let a = a0;
        
        const sequence = [BigInt(a0)];
        const periodStartIndex = 1;
        
        // The sequence is periodic. We stop when a_k = 2*a0.
        // Limit iterations just in case, though period length is bounded by O(n log n)
        // Typically relatively short.
        let safeguard = 0;
        while (safeguard < 1000) {
            m = d * a - m;
            d = (n - m * m) / d;
            a = Math.floor((a0 + m) / d);
            
            sequence.push(BigInt(a));
            
            if (a === 2 * a0) {
                break;
            }
            safeguard++;
        }
        
        return { sequence, periodStartIndex };
    }

    function calculateContinuedFraction(numStr) {
        // 1. Check for specific formats to use exact algorithms
        const lowerStr = numStr.trim().toLowerCase();
        
        // Exact Golden Ratio [1; \overline{1}]
        if (lowerStr === 'phi') {
            return { sequence: [1n, 1n], periodStartIndex: 1 };
        }

        // sqrt(n)
        if (lowerStr.startsWith('sqrt(') && lowerStr.endsWith(')')) {
            const inner = lowerStr.substring(5, lowerStr.length - 1);
            // Check if inner is a clean positive integer
            if (/^\d+$/.test(inner)) {
                const n = parseInt(inner, 10);
                if (!isNaN(n) && n > 0) {
                    return solveSqrtSequence(n);
                }
            }
        }

        // 2. Fallback to generic rational/float solver
        const rational = parseInputToRational(numStr);
        if (!rational) return null;

        let { num, den } = rational;
        const result = [];
        const maxIterations = 200; 

        for (let i = 0; i < maxIterations; i++) {
            if (den === 0n) break;

            const quotient = num / den; 
            const remainder = num % den;

            result.push(quotient);

            if (remainder === 0n) break;

            num = den;
            den = remainder;
        }

        return { sequence: result, periodStartIndex: null };
    }

    function formatNotation(data) {
        const { sequence, periodStartIndex } = data;
        if (sequence.length === 0) return '';
        if (sequence.length === 1) return `[${sequence[0]}]`;
        
        // Standard non-periodic
        if (periodStartIndex === null) {
            const first = sequence[0];
            const rest = sequence.slice(1).join(', ');
            return `[${first}; ${rest}]`;
        }

        // Periodic: [a0; (a1, ..., ak)]
        const prePeriod = sequence.slice(0, periodStartIndex);
        const period = sequence.slice(periodStartIndex);
        
        const preStr = prePeriod.join('; '); // typically just a0
        const periodStr = period.join(', ');
        
        return `[${preStr}; (${periodStr})]`;
    }

    function generateLatex(data) {
        const { sequence, periodStartIndex } = data;
        if (sequence.length === 0) return '';
        
        const maxVisualDepth = 15;

        if (periodStartIndex !== null) {
             const prePeriod = sequence.slice(0, periodStartIndex);
             const period = sequence.slice(periodStartIndex);
             
             // Compact notation: [a0; \overline{a1, a2}]
             // Handle separators: first is ';', rest are ','
             let preStr = "";
             if (prePeriod.length > 0) {
                 preStr = prePeriod[0].toString();
                 if (prePeriod.length > 1) {
                     preStr += "; " + prePeriod.slice(1).join(', ');
                 }
             }
             
             const periodStr = period.join(', ');
             // Use double backslashes so the file contains \\overline, which JS parses as \overline
             const compact = `[${preStr}; \\overline{${periodStr}}]`;
             
             // Visual fraction
             const effectiveLen = sequence.length;
             
             function buildPeriodicFraction(index) {
                 if (index >= maxVisualDepth || index >= effectiveLen) {
                     return `\\ddots`; 
                 }
                 
                 const val = sequence[index].toString();
                 return `${val} + \\cfrac{1}{${buildPeriodicFraction(index + 1)}}`;
             }
             
             return `$$ ${compact} = ${buildPeriodicFraction(0)} $$`;
        }
        
        // Non-periodic (Truncated)
        const truncated = sequence.length > maxVisualDepth;
        const visibleSequence = truncated ? sequence.slice(0, maxVisualDepth) : sequence;

        function buildFraction(index) {
            if (index === visibleSequence.length - 1) {
                if (truncated) {
                    return `${visibleSequence[index]} + \\cfrac{1}{\\ddots}`;
                }
                return visibleSequence[index].toString();
            }
            return `${visibleSequence[index]} + \\cfrac{1}{${buildFraction(index + 1)}}`;
        }

        return `$$${buildFraction(0)}$$`;
    }

    function generateConvergentsTable(data) {
        const { sequence, periodStartIndex } = data;
        tableBody.innerHTML = '';
        
        const limit = 15; 
        
        let p_prev = 1n, p_prev2 = 0n;
        let q_prev = 0n, q_prev2 = 1n;
        
        for (let i = 0; i < limit; i++) {
            let a;
            // Handle periodicity in table generation
            if (periodStartIndex !== null && i >= sequence.length) {
                const periodLen = sequence.length - periodStartIndex;
                const relativeIdx = (i - periodStartIndex) % periodLen;
                a = sequence[periodStartIndex + relativeIdx];
            } else if (i < sequence.length) {
                a = sequence[i];
            } else {
                break;
            }
            
            // Note: sequence elements are BigInt
            // When wrapping, ensure we treat them as BigInt
            const aBig = BigInt(a);

            const p = aBig * p_prev + p_prev2;
            const q = aBig * q_prev + q_prev2;
            
            let decimalVal = "Infinity";
            if (q !== 0n) {
                try {
                     const val = Number(p) / Number(q);
                     decimalVal = val.toString();
                } catch(e) {
                     decimalVal = "Too large";
                }
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${i + 1}</td>
                <td title="${p} / ${q}">${p.toString()} / ${q.toString()}</td>
                <td>${decimalVal}</td>
            `;
            tableBody.appendChild(row);

            p_prev2 = p_prev;
            p_prev = p;
            
            q_prev2 = q_prev;
            q_prev = q;
        }
    }

    function handleCalculation() {
        const inputVal = numberInput.value;
        if (!inputVal) {
             alert('Please enter a valid number.');
             resultContainer.classList.add('hidden');
             return;
        }

        const data = calculateContinuedFraction(inputVal);

        if (data) {
            const { sequence, periodStartIndex } = data;
            
            if (periodStartIndex !== null) {
                const pre = sequence.slice(0, periodStartIndex).join(', ');
                const period = sequence.slice(periodStartIndex).join(', ');
                sequenceOutput.textContent = `${pre}, (${period})`;
            } else {
                sequenceOutput.textContent = sequence.join(', ');
            }
            
            notationOutput.textContent = formatNotation(data);
            
            texOutput.textContent = generateLatex(data);
            if (window.MathJax) {
                window.MathJax.typesetPromise([texOutput]).catch((err) => console.log('MathJax error:', err));
            }

            generateConvergentsTable(data);

            resultContainer.classList.remove('hidden');
        } else {
            alert('Calculation failed or invalid input.');
            resultContainer.classList.add('hidden');
        }
    }

    calculateBtn.addEventListener('click', handleCalculation);

    numberInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleCalculation();
        }
    });
});