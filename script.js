document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const inputs = {
        model: document.getElementById('model'),
        brand: document.getElementById('brand'),
        color: document.getElementById('color'),
        netQty: document.getElementById('netQty'),
        size: document.getElementById('size'),
        dimL: document.getElementById('dimL'),
        dimB: document.getElementById('dimB'),
        dimH: document.getElementById('dimH'),
        mrp: document.getElementById('mrp'),
        genericName: document.getElementById('genericName'),
        mfgMonth: document.getElementById('mfgMonth'),
        mfgYear: document.getElementById('mfgYear'),
        mfgBy: document.getElementById('mfgBy'),
        careDetails: document.getElementById('careDetails'),
        fsn: document.getElementById('fsn'),
        footerDesc: document.getElementById('footerDesc')
    };

    // Row Toggles
    const toggles = {
        model: document.getElementById('chkModel'),
        color: document.getElementById('chkColor'),
        brand: document.getElementById('chkBrand'),
        netQty: document.getElementById('chkQty'),
        size: document.getElementById('chkSize'),
        dims: document.getElementById('chkDims'),
        mrp: document.getElementById('chkMrp'),
        generic: document.getElementById('chkGeneric')
    };

    // PDF Configuration - Using the new Radio Buttons
    const pdfFormats = document.getElementsByName('pdfFormat');

    const previews = {
        model: document.getElementById('prevModel'),
        brand: document.getElementById('prevBrand'),
        color: document.getElementById('prevColor'),
        netQty: document.getElementById('prevQty'),
        size: document.getElementById('prevSize'),
        dims: document.getElementById('prevDims'),
        mrp: document.getElementById('prevMrp'),
        generic: document.getElementById('prevGeneric'),
        date: document.getElementById('prevDate'),
        mfg: document.getElementById('prevMfg'),
        care: document.getElementById('prevCare'),
        fsnCode: document.getElementById('prevFsnCode'),
        footer: document.getElementById('prevFooter'),
        barcode: document.getElementById('barcode')
    };

    // --- State & Updates ---

    function updateVisibility() {
        const setRowVisible = (id, isVisible) => {
            const el = document.getElementById(id);
            if (!el) return;
            const row = el.closest('tr'); // Get the row containing the cell
            if (row) {
                if (isVisible) row.classList.remove('hidden-row');
                else row.classList.add('hidden-row');
            }
        };

        setRowVisible('prevModel', toggles.model.checked);
        setRowVisible('prevColor', toggles.color.checked);
        setRowVisible('prevBrand', toggles.brand.checked);
        setRowVisible('prevQty', toggles.netQty.checked);
        setRowVisible('prevSize', toggles.size.checked);
        setRowVisible('prevDims', toggles.dims.checked);
        setRowVisible('prevMrp', toggles.mrp.checked);
        setRowVisible('prevGeneric', toggles.generic.checked);
    }

    function updateLabelShape() {
        const previewEl = document.getElementById('labelPreview');
        const cloneEl = document.getElementById('labelClone');

        // Ensure accurate element selection
        if (!previewEl || !cloneEl) return;

        let selectedFormat = 'square';
        for (const rb of pdfFormats) {
            if (rb.checked) {
                selectedFormat = rb.value;
                break;
            }
        }

        // Apply strict dimensions
        previewEl.style.width = '384px';
        previewEl.style.height = '384px'; // Force Square

        // Toggle Single/Double View
        if (selectedFormat === 'rect') {
            // "Double Stacked"
            cloneEl.classList.remove('hidden-clone');
            cloneEl.style.width = '384px';
            cloneEl.style.height = '384px';
            // Ensure content is synced immediately when shown
            updatePreview();
        } else {
            // Hide Duplicate
            cloneEl.classList.add('hidden-clone');
        }
    }

    function updatePreview() {
        // Text Fields
        previews.model.textContent = inputs.model.value;
        previews.brand.textContent = inputs.brand.value;
        previews.color.textContent = inputs.color.value;
        previews.netQty.textContent = inputs.netQty.value;
        previews.size.textContent = inputs.size.value;

        // Dimensions Logic
        const l = inputs.dimL.value || 0;
        const b = inputs.dimB.value || 0;
        const h = inputs.dimH.value || 0;
        previews.dims.textContent = `(${l}x${b}x${h})cm`;

        previews.mrp.textContent = inputs.mrp.value;
        previews.generic.textContent = inputs.genericName.value;

        // Date Logic
        previews.date.textContent = `${inputs.mfgMonth.value}-${inputs.mfgYear.value}`;

        previews.mfg.textContent = inputs.mfgBy.value;
        previews.care.textContent = inputs.careDetails.value;
        previews.fsnCode.textContent = inputs.fsn.value;
        previews.footer.textContent = inputs.footerDesc.value;

        // Barcode Logic
        try {
            JsBarcode("#barcode", inputs.fsn.value, {
                format: "CODE128",
                lineColor: "#000",
                width: 2,
                height: 100,
                displayValue: false,
                margin: 0
            });
        } catch (e) {
            console.error("Barcode Generation Error", e);
        }

        // Sync Clone
        const sourceHtml = document.getElementById('labelPreview').innerHTML;
        const safeHtml = sourceHtml.replace(/id="/g, 'data-id="');
        document.getElementById('labelClone').innerHTML = safeHtml;
    }

    // Attach Listeners
    Object.values(inputs).forEach(input => {
        input.addEventListener('input', updatePreview);
    });

    Object.values(toggles).forEach(toggle => {
        toggle.addEventListener('change', updateVisibility);
    });

    // Listen for PDF Switch Change to update visual preview instantly
    pdfFormats.forEach(rb => {
        rb.addEventListener('change', updateLabelShape);
    });

    // Initial load
    updatePreview();
    updateVisibility();
    updateLabelShape();

    // --- PDF Generation ---
    document.getElementById('downloadPdfBtn').addEventListener('click', async () => {
        const btn = document.getElementById('downloadPdfBtn');
        const originalText = btn.textContent;
        btn.textContent = "Generating...";
        btn.disabled = true;

        try {
            const { jsPDF } = window.jspdf;

            // Determine selected format
            let selectedFormat = 'square';
            for (const rb of pdfFormats) {
                if (rb.checked) {
                    selectedFormat = rb.value;
                    break;
                }
            }

            // Generate the high-res image of the label
            // We capture only ONE square label source
            const element = document.getElementById('labelPreview');
            const canvas = await html2canvas(element, {
                scale: 2, // Reduced from 4 for better stability
                backgroundColor: "#ffffff",
                logging: false,
                useCORS: true // Attempt to handle external assets if any
            });
            const imgData = canvas.toDataURL('image/png');

            let doc;

            // Dimensions in mm
            // 4 inch = 101.6 mm
            const labelSize = 101.6;

            if (selectedFormat === 'square') {
                // Square PDF (4x4)
                // STRICTLY 101.6 x 101.6
                doc = new jsPDF({
                    orientation: 'p',
                    unit: 'mm',
                    format: [labelSize, labelSize]
                });
                // Fill page exactly
                doc.addImage(imgData, 'PNG', 0, 0, labelSize, labelSize);
            } else {
                // "Double Stacked" PDF with a gap
                const gap = 5; // 5mm
                const totalHeight = (labelSize * 2) + gap;

                doc = new jsPDF({
                    orientation: 'p',
                    unit: 'mm',
                    format: [labelSize, totalHeight]
                });

                // Label 1 (Top)
                doc.addImage(imgData, 'PNG', 0, 0, labelSize, labelSize);

                // Label 2 (Bottom)
                doc.addImage(imgData, 'PNG', 0, labelSize + gap, labelSize, labelSize);
            }

            const fileName = inputs.fsn.value ? `Label_${inputs.fsn.value}.pdf` : 'Label.pdf';
            doc.save(fileName);
        } catch (error) {
            console.error("PDF Generation Error:", error);
            alert("Failed to generate PDF. Check console for details.");
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    // --- Print Function ---
    document.getElementById('printBtn').addEventListener('click', () => {
        window.print();
    });

    // --- Clear Function ---
    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm("Are you sure you want to clear all fields?")) {
            Object.values(inputs).forEach(input => {
                // Keep dropdowns to defaults or first option?
                if (input.tagName === 'SELECT') {
                    input.selectedIndex = 0;
                } else {
                    input.value = "";
                }
            });
            // Update preview immediately
            updatePreview();
        }
    });
});
