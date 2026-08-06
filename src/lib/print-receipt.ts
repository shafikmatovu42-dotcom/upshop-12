export function printThermalReceipt(transaction: any, userProfile: any, type: 'sale' | 'return' | 'debt_payment') {
  if (typeof window === 'undefined' || !userProfile) return;

  const isPrintingEnabled = userProfile.receiptPrintingEnabled !== undefined 
    ? !!userProfile.receiptPrintingEnabled 
    : true;
  if (!isPrintingEnabled) return;

  const iframeId = 'receipt-print-iframe';
  let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
  }

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) return;

  const dateStr = transaction.timestamp 
    ? new Date(transaction.timestamp).toLocaleString() 
    : new Date().toLocaleString();

  const isSale = type === 'sale';
  const isReturn = type === 'return';
  const isDebtPayment = type === 'debt_payment';

  let title = 'Terminal Sales Receipt';
  if (isReturn) title = 'Return Reinstatement slip';
  if (isDebtPayment) title = 'Debt Repayment slip';

  let itemsHtml = '';
  if (isSale) {
    const items = transaction.items || [];
    itemsHtml = items.map((it: any) => `
      <div style="display: flex; flex-direction: column; margin-bottom: 6px;">
        <div style="font-weight: bold; font-size: 11px;">${it.name}</div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #444;">
          <span>${it.quantity} x Shs ${(it.customPrice !== undefined ? it.customPrice : it.price).toLocaleString()}</span>
          <span>Shs ${((it.customPrice !== undefined ? it.customPrice : it.price) * it.quantity).toLocaleString()}</span>
        </div>
      </div>
    `).join('');
  } else if (isReturn) {
    itemsHtml = `
      <div style="display: flex; flex-direction: column; margin-bottom: 6px;">
        <div style="font-weight: bold; font-size: 11px;">${transaction.productName}</div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #444;">
          <span>Qty Returned: ${transaction.quantity}</span>
          <span>Shs ${transaction.amount.toLocaleString()}</span>
        </div>
      </div>
    `;
  } else if (isDebtPayment) {
    itemsHtml = `
      <div style="display: flex; flex-direction: column; margin-bottom: 6px;">
        <div style="font-weight: bold; font-size: 11px; text-transform: uppercase;">Debt Payment Details</div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 4px;">
          <span>Original Sale:</span>
          <span>#${(transaction.saleId || '').slice(0, 8)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 2px;">
          <span>Amount Paid:</span>
          <span style="font-weight: bold;">Shs ${transaction.amount.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 2px;">
          <span>Remaining Debt:</span>
          <span style="font-weight: bold; color: #dd2c00;">Shs ${(transaction.remainingDebt || 0).toLocaleString()}</span>
        </div>
      </div>
    `;
  }

  const totalAmount = isSale 
    ? (transaction.total || 0) 
    : (transaction.amount || 0);

  // Render signature block if it's a credit sale or debt payment
  const showSignatureBlock = (isSale && transaction.paymentMethod === 'credit') || isDebtPayment;

  const signatureHtml = showSignatureBlock ? `
    <div style="margin-top: 22px; font-size: 10px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px dotted #ccc; padding-bottom: 2px;">
        <span>Customer Sign:</span>
        <span>________________</span>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding-bottom: 2px;">
        <span>Authorized Sign:</span>
        <span>________________</span>
      </div>
    </div>
  ` : '';

  const businessName = userProfile.businessName || 'UPSHOP ENTERPRISE';
  const location = userProfile.location || 'Central Shopee Console';
  const motto = userProfile.motto ? `"${userProfile.motto}"` : 'Quality & Service Guaranteed';
  const agentName = userProfile.fullName || userProfile.email || 'Active Admin Agent';

  const paperWidth = userProfile.receiptPaperWidth || '58mm';
  let pageSizeCss = '58mm auto';
  let bodyWidthCss = '54mm';
  let fontSizeCss = '11px';
  let headerFontSizeCss = '14px';

  if (paperWidth === '76mm') {
    pageSizeCss = '76mm auto';
    bodyWidthCss = '70mm';
    fontSizeCss = '12px';
    headerFontSizeCss = '16px';
  } else if (paperWidth === '80mm') {
    pageSizeCss = '80mm auto';
    bodyWidthCss = '74mm';
    fontSizeCss = '13px';
    headerFontSizeCss = '18px';
  }

  const receiptContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt #${(transaction.id || transaction.saleId || '').slice(0, 8)}</title>
      <style>
        @page {
          size: ${pageSizeCss};
          margin: 0;
        }
        body {
          font-family: 'Courier New', Courier, monospace;
          width: ${bodyWidthCss};
          margin: 0 auto;
          padding: 4mm 2mm;
          font-size: ${fontSizeCss};
          line-height: 1.2;
          color: #000;
          background: #fff;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .divider {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        .double-divider {
          border-top: 2px double #000;
          margin: 8px 0;
        }
        .header-title {
          font-size: ${headerFontSizeCss};
          font-weight: bold;
          margin-bottom: 2px;
          text-transform: uppercase;
        }
        .footer {
          margin-top: 14px;
          font-size: 9px;
        }
      </style>
    </head>
    <body>
      <div class="text-center">
        <div class="header-title">${businessName}</div>
        <div style="font-size: 9px; font-weight: bold; margin-bottom: 2px;">${location}</div>
        <div style="font-size: 8px; font-style: italic; margin-bottom: 4px;">${motto}</div>
        <div style="font-size: 10px; font-weight: bold; text-decoration: underline;">${title}</div>
      </div>

      <div class="divider"></div>

      <div>
        <div><span class="bold">Date/Time:</span> ${dateStr}</div>
        <div><span class="bold">Trans ID:</span> #${(transaction.id || transaction.saleId || '').slice(0, 12)}</div>
        <div><span class="bold">Attending Agent:</span> ${agentName}</div>
        <div><span class="bold">Customer:</span> ${transaction.customerName || 'Normal Customer'}</div>
        <div><span class="bold">Doc Category:</span> ${isSale ? 'OFFICIAL SALE' : isReturn ? 'STOCK RETURN' : 'DEBT PAYMENT'}</div>
      </div>

      <div class="divider"></div>

      <div class="bold" style="font-size: 10px; margin-bottom: 6px;">LINE ITEMS / BREAKDOWN</div>
      ${itemsHtml}

      <div class="double-divider"></div>

      <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px;">
        <span>TOTAL AMOUNT:</span>
        <span>Shs ${totalAmount.toLocaleString()}</span>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 4px;">
        <span>Payment Method:</span>
        <span style="text-transform: uppercase; font-weight: bold;">${transaction.paymentMethod || (isSale ? 'CASH' : isReturn ? 'CASH REFUND' : 'DEBT CASH')}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 10px;">
        <span>Settlement Status:</span>
        <span style="text-transform: uppercase; font-weight: bold;">${transaction.status || (isSale ? 'PAID' : isReturn ? 'REINSTATED' : 'PROCESSED')}</span>
      </div>

      ${isReturn && transaction.reason ? `
        <div style="margin-top: 6px; font-size: 9px; font-style: italic; border: 1px solid #ccc; padding: 4px; border-radius: 4px;">
          Return Reason: ${transaction.reason}
        </div>
      ` : ''}

      ${signatureHtml}

      <div class="divider"></div>

      <div class="text-center footer">
        <div style="font-weight: bold;">Thank you for shopping with ${businessName}!</div>
        <div style="font-size: 8px; margin-top: 2px;">Verified by UPShop Console • Powered by JAHWI AI</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  iframeDoc.open();
  iframeDoc.write(receiptContent);
  iframeDoc.close();
}
