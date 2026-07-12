/**
 * case-law-data.js — InheritancePro 已驗證裁判資料庫
 *
 * 僅可收錄已逐字核對司法院裁判書原文的資料。
 */
(function () {
  'use strict';

  window.IP_CASE_LAW = Object.freeze({
    inheritance: Object.freeze([]),
    alimony: Object.freeze([]),
    minorDamages: Object.freeze([]),
    caregiver: Object.freeze([]),
    propertySplit: Object.freeze([]),
    accident: Object.freeze([
      Object.freeze({
        caseNo: '臺灣臺北地方法院 110 年度簡字第 71 號民事判決',
        judgmentDate: '2021-05-13',
        amount: 76668,
        amountLabel: '判決准許總額 NT$ 76,668',
        summary: '汽車未禮讓行人，致行人受頭部外傷、頸部拉傷及多處挫傷。法院准許醫療費 16,668 元及精神慰撫金 60,000 元；工作損失因舉證不足未獲准。',
        law: '民法§184、§193、民法§195',
        verified: true,
        verifiedAt: '2026-06-24',
        sourceType: '司法院裁判書原文',
        finality: 'unknown',
        sourceUrl: 'https://judgment.judicial.gov.tw/FJUD/data.aspx?ty=JD&id=TPDV%2c110%2c%e7%b0%a1%2c71%2c20210513%2c2&ot=in',
        evidence: Object.freeze([
          '被告應給付原告新臺幣柒萬陸仟陸佰陸拾捌元',
          '應以60,000元計算為適當'
        ])
      }),
      Object.freeze({
        caseNo: '臺灣臺中地方法院 97 年度訴字第 687 號民事判決',
        judgmentDate: '2008-09-30',
        amount: 689093,
        amountLabel: '判決准許總額 NT$ 689,093',
        summary: '駕駛開啟車門撞及機車騎士，造成左鎖骨粉碎性骨折等傷害。法院准許醫療與看護等費用 83,093 元、六個月工作損失 306,000 元及慰撫金 300,000 元。',
        law: '民法§191-2、§193、民法§195',
        verified: true,
        verifiedAt: '2026-06-24',
        sourceType: '司法院裁判書原文',
        finality: 'unknown',
        sourceUrl: 'https://judgment.judicial.gov.tw/FJUD/data.aspx?ty=JD&id=TCDV%2c97%2c%e8%a8%b4%2c687%2c20080930%2c1&ot=in',
        evidence: Object.freeze([
          '被告應給付原告新臺幣陸拾捌萬玖仟零玖拾叁元',
          '原告所得請求之金額合計為689,093元'
        ])
      }),
      Object.freeze({
        caseNo: '臺灣高等法院 109 年度上易字第 1077 號民事判決',
        judgmentDate: '2021-02-24',
        amount: 996940,
        amountLabel: '代位求償准許額 NT$ 996,940',
        summary: '未投保強制險之機車事故致被害人重傷失能。法院認定損害總額 4,984,698 元，被害人負 80% 過失；特別補償基金代位求償 996,940 元獲准。',
        law: '民法§184、§187、§191-2、§193、民法§195、§217；強制汽車責任保險法§42',
        verified: true,
        verifiedAt: '2026-06-24',
        sourceType: '司法院裁判書原文',
        finality: 'confirmed-final',
        sourceUrl: 'https://judgment.judicial.gov.tw/FJUD/data.aspx?ty=JD&id=TPHV%2c109%2c%e4%b8%8a%e6%98%93%2c1077%2c20210224%2c1&ot=in',
        evidence: Object.freeze([
          '鄭重輝因本件車禍所受損害合計應為4,984,698元',
          '被上訴人得請求上訴人賠償之金額應為996,940元'
        ])
      }),
      Object.freeze({
        caseNo: '臺灣新北地方法院 109 年度訴字第 2968 號民事判決',
        judgmentDate: '2020-12-15',
        amount: 2226765,
        amountLabel: '扣除保險等後 NT$ 2,226,765',
        summary: '無照駕駛撞擊自行車騎士，造成顱內出血、多處骨折並受監護宣告。法院認定損害 4,251,765 元，扣除強制險 200 萬元及已付款 25,000 元後，准許 2,226,765 元。',
        law: '民法§184、§191-2、§193、民法§195；強制汽車責任保險法§32',
        verified: true,
        verifiedAt: '2026-06-24',
        sourceType: '司法院裁判書原文',
        finality: 'unknown',
        sourceUrl: 'https://judgment.judicial.gov.tw/FJUD/data.aspx?ty=JD&id=PCDV%2c109%2c%e8%a8%b4%2c2968%2c20201215%2c1&ot=in',
        evidence: Object.freeze([
          '被告應給付原告新臺幣貳佰貳拾貳萬陸仟柒佰陸拾伍元',
          '原告請求賠償數額應以222萬6,765元為限'
        ])
      }),
      Object.freeze({
        caseNo: '臺灣高等法院 110 年度上字第 934 號民事判決',
        judgmentDate: '2023-11-29',
        amount: 1426953,
        amountLabel: '確定判決准許額 NT$ 1,426,953',
        summary: '違規左轉車輛撞倒機車騎士後，騎士再遭計程車輾壓死亡。高院將母親慰撫金由一審 300 萬元改為 200 萬元；連同殯葬、扶養費並扣除強制險及已付款後，准許 1,426,953 元，判決不得上訴。',
        law: '民法§184、民法§185、§188、§194',
        verified: true,
        verifiedAt: '2026-06-24',
        sourceType: '司法院裁判書原文',
        finality: 'confirmed-final',
        sourceUrl: 'https://judgment.judicial.gov.tw/FJUD/data.aspx?ty=JD&id=TPHV%2c110%2c%e4%b8%8a%2c934%2c20231129%2c1&ot=in',
        evidence: Object.freeze([
          '被上訴人合計得請求上訴人賠償之金額為1,426,953元',
          '應以200萬元為適當'
        ])
      })
    ])
  });
})();
