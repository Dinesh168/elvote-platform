import React from 'react';
import PrintVoterSlip from '../printvoterslip/PrintVoterSlip';
import { STRINGS } from '../../strings';

export default function VoterListSlipPrint({ 
  sno,
  name,
  age,
  gender,
  relativeName,
  epicNo,
  address,
  pollingStationName,
  pollingStationAddress,
  partNo,
  leaderName,
  ballotNo,
  images = {
    party: '',
    leader: ''
  }
}) {

  const getHtml = () => {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }

          @page {
            size: 2.8in auto;
            margin: 0.08in;
          }

          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            color: #111;
            background: #fff;
            width: 2.64in;
          }

          /* ── Outer card ── */
          .card {
            border: 1.5px solid #1a3f8f;
            border-radius: 6px;
            overflow: hidden;
          }

          /* ── Header ── */
          .header {
            background: linear-gradient(135deg, #1a3f8f 0%, #2563eb 100%);
            color: #fff;
            padding: 10px 8px 8px;
            text-align: center;
          }
          .leader-photo {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(255,255,255,0.7);
            display: block;
            margin: 0 auto 6px;
          }
          .leader-name {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.2px;
            line-height: 1.3;
            text-transform: uppercase;
          }
          .ballot-pill {
            display: inline-block;
            margin-top: 5px;
            background: rgba(255,255,255,0.18);
            border: 1px solid rgba(255,255,255,0.45);
            border-radius: 20px;
            padding: 2px 10px;
            font-size: 9px;
            letter-spacing: 0.4px;
          }
          .ballot-pill strong {
            font-size: 11px;
          }

          /* ── Section header ── */
          .sec-head {
            background: #dbeafe;
            color: #1e40af;
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            padding: 3px 8px;
            border-top: 1px solid #bfdbfe;
            border-bottom: 1px solid #bfdbfe;
          }

          /* ── Data rows ── */
          .rows { padding: 2px 0; }
          .row {
            display: flex;
            align-items: flex-start;
            padding: 4px 8px;
            border-bottom: 1px dashed #e5e7eb;
            gap: 4px;
          }
          .row:last-child { border-bottom: none; }
          .row.alt { background: #f8faff; }
          .lbl {
            font-size: 8px;
            color: #6b7280;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            white-space: nowrap;
            min-width: 52px;
            padding-top: 1px;
          }
          .val {
            font-size: 10px;
            font-weight: 600;
            color: #111827;
            text-align: right;
            flex: 1;
            word-break: break-word;
          }
          .val.mono {
            font-family: 'Courier New', monospace;
            font-size: 9.5px;
            letter-spacing: 0.3px;
          }
          .badge {
            background: #1a3f8f;
            color: #fff;
            border-radius: 4px;
            padding: 1px 6px;
            font-size: 10px;
            font-weight: 700;
            display: inline-block;
          }

          /* ── Footer ── */
          .footer {
            background: #f1f5f9;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            padding: 4px 8px;
            font-size: 7.5px;
            color: #94a3b8;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        <div class="card">

          <!-- Header / Candidate -->
          <div class="header">
            ${images.leader ? `<img src="${images.leader}" class="leader-photo" onerror="this.style.display='none'" />` : ''}
            <div class="leader-name">${leaderName || ''}</div>
            <div class="ballot-pill">
              ${STRINGS.VOTER_SLIP_BALLOT_NO}&nbsp;<strong>${ballotNo}</strong>
            </div>
          </div>

          <!-- Voter Details -->
          <div class="sec-head">Voter Details</div>
          <div class="rows">
            <div class="row">
              <span class="lbl">${STRINGS.VOTER_SLIP_SERIAL_NO}</span>
              <span class="val"><span class="badge">${sno}</span></span>
            </div>
            <div class="row alt">
              <span class="lbl">${STRINGS.VOTER_SLIP_EPIC}</span>
              <span class="val mono">${epicNo}</span>
            </div>
            <div class="row">
              <span class="lbl">${STRINGS.VOTER_SLIP_NAME}</span>
              <span class="val">${name}</span>
            </div>
            <div class="row alt">
              <span class="lbl">${STRINGS.VOTER_SLIP_REL_NAME}</span>
              <span class="val">${relativeName}</span>
            </div>
            <div class="row">
              <span class="lbl">${STRINGS.VOTER_SLIP_AGE} / ${STRINGS.VOTER_SLIP_GENDER}</span>
              <span class="val">${age} &nbsp;/&nbsp; ${gender}</span>
            </div>
            <div class="row alt">
              <span class="lbl">${STRINGS.VOTER_SLIP_ADDRESS}</span>
              <span class="val">${address}</span>
            </div>
          </div>

          <!-- Polling Station -->
          <div class="sec-head">${STRINGS.VOTER_SLIP_POLLING_STATION}</div>
          <div class="rows">
            <div class="row">
              <span class="lbl">${STRINGS.VOTER_SLIP_BOOTH_NO}</span>
              <span class="val"><span class="badge">${partNo}</span></span>
            </div>
            <div class="row alt">
              <span class="lbl">${STRINGS.VOTER_SLIP_POLLING_STATION_NAME}</span>
              <span class="val">${pollingStationName}</span>
            </div>
            <div class="row">
              <span class="lbl">${STRINGS.VOTER_SLIP_POLLING_STATION_ADDRESS}</span>
              <span class="val">${pollingStationAddress}</span>
            </div>
          </div>

          <div class="footer">ELVote &bull; Voter Slip</div>
        </div>
      </body>
      </html>
    `
  }
  
  return (
    <>
      <PrintVoterSlip html={getHtml()} />
    </>
  );
}
