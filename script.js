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
            // Remove whitespace
            str = str.trim();
            if (!str) return null;

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

    function calculateContinuedFraction(numStr) {
        const rational = parseInputToRational(numStr);
        if (!rational) return null;

        let { num, den } = rational;
        const result = [];
        const maxIterations = 200; // Can safely go higher with BigInt

        // Standard Euclidean Algorithm style loop
        // n / d = q + r / d
        // Next step invert: d / r
        
        for (let i = 0; i < maxIterations; i++) {
            if (den === 0n) break;

            const quotient = num / den; // BigInt integer division
            const remainder = num % den;

            result.push(quotient);

            if (remainder === 0n) break;

            // Invert for next step: new num is old den, new den is remainder
            num = den;
            den = remainder;
        }

        return result;
    }

    function formatNotation(sequence) {
        if (sequence.length === 0) return '';
        if (sequence.length === 1) return `[${sequence[0]}]`;
        
        // Format as [a0; a1, a2, ..., an]
        const first = sequence[0];
        const rest = sequence.slice(1).join(', ');
        return `[${first}; ${rest}]`;
    }

    function generateLatex(sequence) {
        if (sequence.length === 0) return '';
        
        const maxVisualDepth = 15;
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

    function generateConvergentsTable(sequence) {
        tableBody.innerHTML = '';
        
        const limit = Math.min(sequence.length, 15);
        
        let p_prev = 1n, p_prev2 = 0n;
        let q_prev = 0n, q_prev2 = 1n;
        
        for (let i = 0; i < limit; i++) {
            const a = sequence[i]; // already BigInt
            
            const p = a * p_prev + p_prev2;
            const q = a * q_prev + q_prev2;
            
            // Calculate decimal for display (approximate)
            let decimalVal = "Infinity";
            if (q !== 0n) {
                // To get decent precision from BigInt division for display:
                // Multiply numerator by precision factor, divide, then format
                // Simple Number() conversion works for smaller values, but let's be safer
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
        // Basic validation before passing to BigInt parser
        // Allow digits, '.', '/', '+', '-'
        if (!inputVal || !/^[-+]?[\d./]+$/.test(inputVal.trim())) {
             alert('Please enter a valid decimal number or fraction (e.g. 3.14 or 22/7).');
             resultContainer.classList.add('hidden');
             return;
        }

        const sequence = calculateContinuedFraction(inputVal);

        if (sequence) {
            sequenceOutput.textContent = sequence.join(', ');
            notationOutput.textContent = formatNotation(sequence);
            
            texOutput.textContent = generateLatex(sequence);
            if (window.MathJax) {
                window.MathJax.typesetPromise([texOutput]).catch((err) => console.log('MathJax error:', err));
            }

            generateConvergentsTable(sequence);

            resultContainer.classList.remove('hidden');
        } else {
            alert('Calculation failed.');
            resultContainer.classList.add('hidden');
        }
    }

    calculateBtn.addEventListener('click', handleCalculation);

    // Allow pressing Enter to calculate
    numberInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleCalculation();
        }
    });
});
