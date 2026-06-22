// NEXORA GRID — 核心主檔｜假資料（台灣汽車零件經銷情境）
// 組織架構分區的種子資料：部門 / 組 / 職務 / 員工，以及共用字典下拉來源。
// 員工的部門/組/職務皆由「掛的職務」往上推導（規格：員工頁唯讀，指派在組織架構圖）。
(function () {
  'use strict';

  var dict = {
    countries: [
      { code: 'TW', name: '台灣' }, { code: 'JP', name: '日本' }, { code: 'DE', name: '德國' },
      { code: 'US', name: '美國' }, { code: 'CN', name: '中國' }, { code: 'KR', name: '韓國' }
    ],
    regions: [
      { code: 'N', name: '北部' }, { code: 'C', name: '中部' }, { code: 'S', name: '南部' },
      { code: 'E', name: '東部' }, { code: 'I', name: '離島' }
    ],
    currencies: [
      { value: 'TWD', label: 'TWD 新台幣' }, { value: 'USD', label: 'USD 美金' }, { value: 'JPY', label: 'JPY 日圓' }, { value: 'EUR', label: 'EUR 歐元' }, { value: 'CNY', label: 'CNY 人民幣' }
    ],
    genders: ['男', '女', '其他'],
    edu: ['高中', '專科', '大學', '碩士', '博士'],
    military: ['已服', '未服', '免役', '替代役'],
    cities: ['台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市', '新竹市', '彰化縣'],
    zipData: {
      '台北市': [{ area: '中正區', zip: '100' }, { area: '大同區', zip: '103' }, { area: '中山區', zip: '104' }, { area: '松山區', zip: '105' }, { area: '大安區', zip: '106' }, { area: '信義區', zip: '110' }, { area: '內湖區', zip: '114' }, { area: '南港區', zip: '115' }],
      '新北市': [{ area: '板橋區', zip: '220' }, { area: '三重區', zip: '241' }, { area: '中和區', zip: '235' }, { area: '永和區', zip: '234' }, { area: '新莊區', zip: '242' }, { area: '蘆洲區', zip: '247' }, { area: '新店區', zip: '231' }],
      '桃園市': [{ area: '桃園區', zip: '330' }, { area: '中壢區', zip: '320' }, { area: '蘆竹區', zip: '338' }, { area: '龜山區', zip: '333' }, { area: '八德區', zip: '334' }],
      '台中市': [{ area: '中區', zip: '400' }, { area: '東區', zip: '401' }, { area: '西屯區', zip: '407' }, { area: '北屯區', zip: '406' }, { area: '南屯區', zip: '408' }],
      '台南市': [{ area: '中西區', zip: '700' }, { area: '東區', zip: '701' }, { area: '安平區', zip: '708' }, { area: '永康區', zip: '710' }],
      '高雄市': [{ area: '前鎮區', zip: '806' }, { area: '苓雅區', zip: '802' }, { area: '三民區', zip: '807' }, { area: '鳳山區', zip: '830' }],
      '新竹市': [{ area: '東區', zip: '300' }, { area: '北區', zip: '300' }, { area: '香山區', zip: '300' }],
      '彰化縣': [{ area: '彰化市', zip: '500' }, { area: '員林市', zip: '510' }, { area: '鹿港鎮', zip: '505' }]
    }
  };

  // 部門
  var depts = [
    { id: 'SALES', code: 'SALES', name: '銷售部', sort: 1, active: true },
    { id: 'PURCH', code: 'PURCH', name: '採購部', sort: 2, active: true },
    { id: 'WH', code: 'WH', name: '倉儲部', sort: 3, active: true },
    { id: 'FIN', code: 'FIN', name: '財務部', sort: 4, active: true },
    { id: 'ADMIN', code: 'ADMIN', name: '管理部', sort: 5, active: true }
  ];

  // 組（隸屬部門；上層組多留空）
  var groups = [
    { id: 'TPE1', code: 'TPE1', name: '台北一組', dept: 'SALES', parent: '', sort: 1, active: true },
    { id: 'TPE2', code: 'TPE2', name: '台北二組', dept: 'SALES', parent: '', sort: 2, active: true },
    { id: 'TXG1', code: 'TXG1', name: '台中組', dept: 'SALES', parent: '', sort: 3, active: true },
    { id: 'IMP', code: 'IMP', name: '進口採購組', dept: 'PURCH', parent: '', sort: 1, active: true },
    { id: 'DOM', code: 'DOM', name: '國內採購組', dept: 'PURCH', parent: '', sort: 2, active: true },
    { id: 'STOCK', code: 'STOCK', name: '倉管組', dept: 'WH', parent: '', sort: 1, active: true },
    { id: 'LOG', code: 'LOG', name: '物流組', dept: 'WH', parent: '', sort: 2, active: true },
    { id: 'ACC', code: 'ACC', name: '會計組', dept: 'FIN', parent: '', sort: 1, active: true },
    { id: 'CASH', code: 'CASH', name: '出納組', dept: 'FIN', parent: '', sort: 2, active: true },
    { id: 'IT', code: 'IT', name: '資訊組', dept: 'ADMIN', parent: '', sort: 1, active: true },
    { id: 'HRG', code: 'HRG', name: '人事組', dept: 'ADMIN', parent: '', sort: 2, active: true }
  ];

  // 職務（隸屬組；部門由組推導）
  var roles = [
    { id: 'GM', code: 'GM', name: '總經理', level: 'G1', group: 'TPE1', desc: '公司最高主管', sort: 1, active: true },
    { id: 'SALESMGR', code: 'SALESMGR', name: '銷售主管', level: 'G2', group: 'TPE1', desc: '帶領業務團隊', sort: 2, active: true },
    { id: 'SALES', code: 'SALES', name: '業務員', level: 'G3', group: 'TPE1', desc: '負責客戶銷售', sort: 3, active: true },
    { id: 'PURCHMGR', code: 'PURCHMGR', name: '採購主管', level: 'G2', group: 'IMP', desc: '核准採購單', sort: 4, active: true },
    { id: 'PURCH', code: 'PURCH', name: '採購員', level: 'G3', group: 'IMP', desc: '詢價與下採購單', sort: 5, active: true },
    { id: 'WHKEEPER', code: 'WHKEEPER', name: '倉管', level: 'G3', group: 'STOCK', desc: '進出庫與盤點', sort: 6, active: true },
    { id: 'ACCT', code: 'ACCT', name: '會計', level: 'G3', group: 'ACC', desc: '帳務與發票', sort: 7, active: true },
    { id: 'CASHIER', code: 'CASHIER', name: '出納', level: 'G3', group: 'CASH', desc: '收付款', sort: 8, active: true },
    { id: 'ITADMIN', code: 'ITADMIN', name: '資訊人員', level: 'G3', group: 'IT', desc: '系統維運', sort: 9, active: true },
    { id: 'HR', code: 'HR', name: '人資', level: 'G3', group: 'HRG', desc: '人事管理', sort: 10, active: false }
  ];

  // 員工（roleId 為掛的職務；未指派者 roleId 空）
  var emps = [
    { id: 'Y0001', no: 'Y0001', name: '陳建宏', gender: '男', mobile: '0912-345-678', phone: '02-2700-1234', email: 'chen@nexora.tw', roleIds: ['GM'], owner: true, active: true, hire: '2012-03-01', leave: '', nationality: 'TW', edu: '大學', school: '台灣大學' },
    { id: 'Y0002', no: 'Y0002', name: '林雅婷', gender: '女', mobile: '0922-111-222', phone: '02-2700-1235', email: 'lin@nexora.tw', roleIds: ['SALESMGR'], owner: false, active: true, hire: '2014-06-15', leave: '', nationality: 'TW', edu: '大學', school: '政治大學' },
    { id: 'Y0003', no: 'Y0003', name: '王志明', gender: '男', mobile: '0933-333-444', phone: '', email: 'wang@nexora.tw', roleIds: ['SALES'], owner: false, active: true, hire: '2018-09-01', leave: '', nationality: 'TW', edu: '專科', school: '德明科大' },
    { id: 'Y0004', no: 'Y0004', name: '張怡君', gender: '女', mobile: '0955-555-666', phone: '', email: 'chang@nexora.tw', roleIds: ['SALES'], owner: false, active: true, hire: '2020-02-10', leave: '', nationality: 'TW', edu: '大學', school: '淡江大學' },
    { id: 'Y0005', no: 'Y0005', name: '李國銘', gender: '男', mobile: '0966-777-888', phone: '03-3300-5678', email: 'lee@nexora.tw', roleIds: ['PURCHMGR'], owner: false, active: true, hire: '2013-11-20', leave: '', nationality: 'TW', edu: '碩士', school: '中央大學' },
    { id: 'Y0006', no: 'Y0006', name: '黃淑芬', gender: '女', mobile: '0977-888-999', phone: '', email: 'huang@nexora.tw', roleIds: ['PURCH'], owner: false, active: true, hire: '2019-04-05', leave: '', nationality: 'TW', edu: '大學', school: '逢甲大學' },
    { id: 'Y0007', no: 'Y0007', name: '吳承恩', gender: '男', mobile: '0911-222-333', phone: '', email: 'wu@nexora.tw', roleIds: ['WHKEEPER'], owner: false, active: true, hire: '2016-07-18', leave: '', nationality: 'TW', edu: '高中', school: '松山工農' },
    { id: 'Y0008', no: 'Y0008', name: '蔡明翰', gender: '男', mobile: '0900-123-456', phone: '', email: 'tsai@nexora.tw', roleIds: ['WHKEEPER'], owner: false, active: false, hire: '2021-01-12', leave: '', nationality: 'TW', edu: '高中', school: '南港高工' },
    { id: 'Y0009', no: 'Y0009', name: '許美玲', gender: '女', mobile: '0988-456-789', phone: '07-7700-9012', email: 'hsu@nexora.tw', roleIds: ['ACCT'], owner: false, active: true, hire: '2015-05-25', leave: '', nationality: 'TW', edu: '大學', school: '成功大學' },
    { id: 'Y0010', no: 'Y0010', name: '鄭文傑', gender: '男', mobile: '0966-321-654', phone: '', email: 'cheng@nexora.tw', roleIds: ['CASHIER'], owner: false, active: true, hire: '2017-08-30', leave: '', nationality: 'TW', edu: '專科', school: '南臺科大' },
    { id: 'Y0011', no: 'Y0011', name: '劉冠廷', gender: '男', mobile: '0935-987-654', phone: '', email: 'liu@nexora.tw', roleIds: ['ITADMIN'], owner: false, active: true, hire: '2019-10-08', leave: '', nationality: 'TW', edu: '碩士', school: '交通大學' },
    { id: 'Y0012', no: 'Y0012', name: '楊雅雯', gender: '女', mobile: '0921-654-987', phone: '', email: 'yang@nexora.tw', roleIds: [], owner: false, active: false, hire: '2023-03-15', leave: '', nationality: 'TW', edu: '大學', school: '東吳大學' },
    { id: 'Y0013', no: 'Y0013', name: '周大為', gender: '男', mobile: '0913-258-369', phone: '', email: 'chou@nexora.tw', roleIds: [], owner: false, active: false, hire: '2024-01-02', leave: '', nationality: 'TW', edu: '大學', school: '輔仁大學' }
  ];

  // ---- 據點倉庫 ----
  var whTypes = [ // 倉別（系統內建、唯讀）
    { id: 'GOOD', code: 'GOOD', name: '良品倉' }, { id: 'BAD', code: 'BAD', name: '不良品倉' }, { id: 'TRANSIT', code: 'TRANSIT', name: '在途倉' }
  ];
  var sites = [
    { id: 'HQ', code: 'HQ', name: '台北總公司', addr: '台北市內湖區瑞光路 168 號', phone: '02-2700-1000', sort: 1, active: true },
    { id: 'TYC', code: 'TYC', name: '桃園物流中心', addr: '桃園市蘆竹區南崁路 88 號', phone: '03-3220-2000', sort: 2, active: true },
    { id: 'TXG', code: 'TXG', name: '台中營業所', addr: '台中市西屯區工業區一路 12 號', phone: '04-2350-3000', sort: 3, active: true },
    { id: 'KHH', code: 'KHH', name: '高雄營業所', addr: '高雄市前鎮區成功二路 25 號', phone: '07-3360-4000', sort: 4, active: false }
  ];
  var warehouses = [
    { id: 'HQ-G', code: 'HQ-G', name: '台北良品倉', site: 'HQ', whType: 'GOOD', note: '主要出貨倉', sort: 1, active: true },
    { id: 'HQ-B', code: 'HQ-B', name: '台北不良倉', site: 'HQ', whType: 'BAD', note: '退/換貨暫存', sort: 2, active: true },
    { id: 'TYC-M', code: 'TYC-M', name: '桃園主倉', site: 'TYC', whType: 'GOOD', note: '進口進貨主倉', sort: 1, active: true },
    { id: 'TYC-T', code: 'TYC-T', name: '桃園在途倉', site: 'TYC', whType: 'TRANSIT', note: '海運在途', sort: 2, active: true },
    { id: 'TXG-G', code: 'TXG-G', name: '台中良品倉', site: 'TXG', whType: 'GOOD', note: '', sort: 1, active: true }
  ];
  var bins = [
    { id: 'B01', code: 'A-01-01', name: '機油濾區', warehouse: 'HQ-G', site: 'HQ', zone: 'A', rack: '01', level: '01', cell: '', sort: 1, active: true },
    { id: 'B02', code: 'A-01-02', name: '機油濾區', warehouse: 'HQ-G', site: 'HQ', zone: 'A', rack: '01', level: '02', cell: '', sort: 2, active: true },
    { id: 'B03', code: 'A-02-01', name: '煞車片區', warehouse: 'HQ-G', site: 'HQ', zone: 'A', rack: '02', level: '01', cell: '', sort: 3, active: true },
    { id: 'B04', code: 'R-01-01', name: '退貨暫存', warehouse: 'HQ-B', site: 'HQ', zone: 'R', rack: '01', level: '01', cell: '', sort: 1, active: true },
    { id: 'B05', code: 'M-01-01', name: '進口主架', warehouse: 'TYC-M', site: 'TYC', zone: 'M', rack: '01', level: '01', cell: '', sort: 1, active: true },
    { id: 'B06', code: 'M-01-02', name: '進口主架', warehouse: 'TYC-M', site: 'TYC', zone: 'M', rack: '01', level: '02', cell: '', sort: 2, active: true },
    { id: 'B07', code: 'G-01-01', name: '台中良品', warehouse: 'TXG-G', site: 'TXG', zone: 'G', rack: '01', level: '01', cell: '', sort: 1, active: true }
  ];

  // ---- 往來對象（客戶/供應商/同行/物流/廠商/銀行）----
  var custGrades = [
    { id: 'A', code: 'A', name: 'A 級客戶', markup: 35, sort: 1, active: true, builtin: true },
    { id: 'B', code: 'B', name: 'B 級客戶', markup: 28, sort: 2, active: true, builtin: true },
    { id: 'C', code: 'C', name: 'C 級客戶', markup: 20, sort: 3, active: true, builtin: true },
    { id: 'D', code: 'D', name: 'D 級客戶', markup: 12, sort: 4, active: true, builtin: true }
  ];
  var suppGrades = [
    { id: 'A', code: 'A', name: 'A 級供應商', desc: '付款條件最佳', sort: 1, active: true, builtin: true },
    { id: 'B', code: 'B', name: 'B 級供應商', desc: '', sort: 2, active: true, builtin: true },
    { id: 'C', code: 'C', name: 'C 級供應商', desc: '', sort: 3, active: true, builtin: true },
    { id: 'D', code: 'D', name: 'D 級供應商', desc: '', sort: 4, active: true, builtin: true },
    { id: 'VIP', code: 'VIP', name: 'VIP 策略供應商', desc: '客戶自訂等級', sort: 5, active: true, builtin: false }
  ];
  var partnerTypes = { C: '保養廠', O: '同行', S: '供應商', T: '外包物流', V: '一般廠商', B: '銀行' };
  var partners = [
    { id: 'C0001', code: 'C0001', type: 'C', name: '宏達汽車保養廠', shortName: '宏達', contact: '王老闆', phone: '02-2755-1188', mobile: '0928-100-200', email: 'service@hongda.tw', region: 'N', country: 'TW', custGrade: 'A', creditLimit: 500000, creditStatus: 'N', salesEmp: 'Y0003', payTerm: 'NET30', taxId: '12345678', currency: 'TWD', invoiceCopies: '3', active: true,
      contacts: [ { name: '王老闆', dept: '負責人', phone: '02-2755-1188', mobile: '0928-100-200', email: 'boss@hongda.tw', note: '談合約找他' }, { name: '林小姐', dept: '會計', phone: '02-2755-1189', mobile: '', email: 'acc@hongda.tw', note: '只接下午' } ],
      addresses: [ { label: '總店', isDefault: true, city: '台北市', area: '中山區', zip: '104', street: '民權東路二段 50 號', receiver: '王老闆', tel: '02-2755-1188' } ] },
    { id: 'C0002', code: 'C0002', type: 'C', name: '永豐汽車修護廠', shortName: '永豐', contact: '陳師傅', phone: '03-3328-7766', mobile: '0935-300-400', region: 'N', country: 'TW', custGrade: 'B', creditLimit: 200000, creditStatus: 'N', salesEmp: 'Y0004', payTerm: 'NET60', taxId: '23456789', currency: 'TWD', invoiceCopies: '3', active: true, contacts: [], addresses: [] },
    { id: 'O0001', code: 'O0001', type: 'O', name: '聯合汽材行', shortName: '聯合', contact: '張經理', phone: '04-2260-5544', region: 'C', country: 'TW', custGrade: 'A', allowTransfer: true, salesEmp: 'Y0003', payTerm: 'NET30', taxId: '34567890', currency: 'TWD', active: true, contacts: [], addresses: [] },
    { id: 'S0001', code: 'S0001', type: 'S', name: 'BOSCH 台灣分公司', shortName: 'BOSCH', eng: 'Bosch Taiwan', contact: 'Mr. Schmidt', phone: '02-7734-1000', region: 'N', country: 'DE', suppGrade: 'A', payTerm: 'NET60', importPayTerm: 'TT', tradeTerm: 'CIF', currency: 'USD', defaultInWh: 'TYC-M', taxId: '45678901', active: true,
      contacts: [ { name: '李副理', dept: '業務部', phone: '02-7734-1001', mobile: '0911-500-600', email: 'sales@bosch.tw', note: '叫貨' } ], addresses: [] },
    { id: 'S0002', code: 'S0002', type: 'S', name: '上海納鐵福傳動', shortName: '納鐵福', eng: 'NTN Shanghai', contact: '周經理', phone: '+86-21-5588-2000', region: '', country: 'CN', suppGrade: 'B', payTerm: 'NET90', importPayTerm: 'LC', tradeTerm: 'FOB', currency: 'USD', defaultInWh: 'TYC-M', active: true, contacts: [], addresses: [] },
    { id: 'T0001', code: 'T0001', type: 'T', name: '黑貓宅急便', shortName: '黑貓', contact: '客服中心', phone: '0800-090-000', region: 'N', country: 'TW', active: true, contacts: [], addresses: [] },
    { id: 'V0001', code: 'V0001', type: 'V', name: '全台文具行', shortName: '全台', contact: '老闆娘', phone: '02-2999-1234', region: 'N', country: 'TW', payTerm: 'PREPAY', taxId: '56789012', active: true, contacts: [], addresses: [] },
    { id: 'B0001', code: 'B0001', type: 'B', name: '台灣銀行 內湖分行', shortName: '台銀內湖', contact: '理專', phone: '02-2792-5000', region: 'N', country: 'TW', currency: 'TWD', active: true, contacts: [], addresses: [] }
  ];

  // ---- 補樣本欄位（身分證遮罩、英文名、體檢結果、隸屬據點等示範用）----
  var engNames = { Y0001: 'Chen Chien-Hung', Y0002: 'Lin Ya-Ting', Y0005: 'Lee Kuo-Ming', Y0009: 'Hsu Mei-Ling' };
  var siteOf = { Y0005: 'TYC', Y0006: 'TYC', Y0007: 'TYC', Y0008: 'TYC', Y0003: 'TXG', Y0004: 'TXG' };
  emps.forEach(function (e, i) {
    e.idno = e.idno || ('A' + (i % 2 === 0 ? '1' : '2') + '234' + String(56789 + i).slice(0, 5));
    e.eng = e.eng || engNames[e.no] || '';
    e.medResult = e.medResult || '合格';
    e.twoFa = e.twoFa || false;
    if (e.siteId === undefined) e.siteId = e.roleIds && e.roleIds.length ? (siteOf[e.no] || 'HQ') : '';
  });

  // ---- 產品與廠牌 ----
  var brands = [
    { id: 'BSH', code: 'BSH', name: '博世', eng: 'BOSCH', country: 'DE', isCar: false, isPart: true, sort: 1, active: true },
    { id: 'DEN', code: 'DEN', name: '電裝', eng: 'DENSO', country: 'JP', isCar: false, isPart: true, sort: 2, active: true },
    { id: 'NTN', code: 'NTN', name: '恩梯恩', eng: 'NTN', country: 'JP', isCar: false, isPart: true, sort: 3, active: true },
    { id: 'VAG', code: 'VAG', name: '福斯集團', eng: 'VAG', country: 'DE', isCar: true, isPart: true, sort: 4, active: true },
    { id: 'TOY', code: 'TOY', name: '豐田', eng: 'TOYOTA', country: 'JP', isCar: true, isPart: false, sort: 5, active: true }
  ];
  var partGroups = [
    { id: 'OILF', code: 'OILF', name: '機油濾', shelfLife: 36, sort: 1, active: true },
    { id: 'BRKP', code: 'BRKP', name: '煞車片', shelfLife: 0, sort: 2, active: true },
    { id: 'SPLG', code: 'SPLG', name: '火星塞', shelfLife: 0, sort: 3, active: true },
    { id: 'BATT', code: 'BATT', name: '電瓶', shelfLife: 12, sort: 4, active: true },
    { id: 'WIPR', code: 'WIPR', name: '雨刷', shelfLife: 24, sort: 5, active: true }
  ];
  var parts = [
    { id: 'P0001', code: '06L115562B', name: '機油濾芯 1.8T', genuine: true, brandPn: '06L115562B', oldPn: '06L 115 562 B', brand: 'BSH', group: 'OILF', ptype: '專用件', origin: 'DE', unit: 'pcs', priceA: 480, priceB: 440, priceC: 400, priceD: 360, cost: 260, returnPolicy: 'W', warranty: 12, safeQty: 20, maxQty: 200, active: true },
    { id: 'P0002', code: '04152YZZA1', name: '機油濾芯 豐田通用', genuine: true, brandPn: '04152-YZZA1', oldPn: '04152YZZA1', brand: 'DEN', group: 'OILF', ptype: '通用件', origin: 'JP', unit: 'pcs', priceA: 320, priceB: 295, priceC: 270, priceD: 240, cost: 165, returnPolicy: 'W', warranty: 12, safeQty: 30, maxQty: 300, active: true },
    { id: 'P0003', code: 'DB1521', name: '前煞車來令片', genuine: false, brandPn: 'DB1521', oldPn: 'DB1521', brand: 'BSH', group: 'BRKP', ptype: '專用件', origin: 'DE', unit: 'pcs', priceA: 1280, priceB: 1180, priceC: 1080, priceD: 980, cost: 680, returnPolicy: 'S', warranty: 6, safeQty: 10, maxQty: 80, active: true },
    { id: 'P0004', code: 'SC20HR11', name: '銥合金火星塞', genuine: true, brandPn: 'SC20HR11', oldPn: 'SC20HR11', brand: 'DEN', group: 'SPLG', ptype: '通用件', origin: 'JP', unit: 'pcs', priceA: 380, priceB: 350, priceC: 320, priceD: 290, cost: 195, returnPolicy: 'F', warranty: 12, safeQty: 40, maxQty: 400, active: true },
    { id: 'P0005', code: '56219', name: '汽車電瓶 60Ah', genuine: true, brandPn: '56219', oldPn: '56219', brand: 'BSH', group: 'BATT', ptype: '專用件', origin: 'DE', unit: 'pcs', priceA: 2680, priceB: 2480, priceC: 2280, priceD: 2080, cost: 1450, returnPolicy: 'F', warranty: 18, safeQty: 8, maxQty: 50, active: true },
    { id: 'P0006', code: 'AR24', name: '軟骨雨刷 24吋', genuine: false, brandPn: 'AR24', oldPn: 'AR24', brand: 'BSH', group: 'WIPR', ptype: '通用件', origin: 'CN', unit: 'pcs', priceA: 280, priceB: 255, priceC: 230, priceD: 200, cost: 120, returnPolicy: 'N', warranty: 0, safeQty: 50, maxQty: 500, active: true },
    { id: 'P0007', code: 'C-1011', name: '機油濾芯 副廠', genuine: false, brandPn: 'C-1011', oldPn: 'C-1011', brand: 'NTN', group: 'OILF', ptype: '通用件', origin: 'CN', unit: 'pcs', priceA: 180, priceB: 165, priceC: 150, priceD: 130, cost: 85, returnPolicy: 'N', warranty: 0, safeQty: 60, maxQty: 600, active: false }
  ];
  // 零件照片示範（SVG 佔位，供左右瀏覽）
  function ph(label, c1, c2) { return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><text x="200" y="160" font-size="30" fill="#fff" text-anchor="middle" font-family="sans-serif">' + label + '</text></svg>'); }
  parts[0]._photos = [ph('正面', '#3a4a6b', '#1f2a44'), ph('反面', '#6b5a3a', '#44391f'), ph('側面', '#3a6b52', '#1f4433')];
  parts[0].oemRefs = [{ brand: 'VAG', oemPn: '06L 115 562' }, { brand: 'BSH', oemPn: 'F026407123' }];
  parts[0].renumber = [{ date: '2024-06-01', oldPn: '06L115562A', newPn: '06L115562B', reason: '原廠改版' }];
  emps[0].reg = { city: '台北市', area: '內湖區', zip: '114', detail: '瑞光路 168 號 8 樓' };
  emps[0].mail = { city: '台北市', area: '中山區', zip: '104', detail: '民權東路三段 10 號' };
  parts[2]._photos = [ph('煞車片 正面', '#5b3a4a', '#3a1f2a')];

  // 通用件群組（成員可互相替代）
  var univGroups = [
    { id: 'U0001', code: 'U-OILF-18T', name: '1.8T 機油濾通用組', note: '原廠＋副廠可替代', sort: 1, active: true, members: [
      { partId: 'P0001', role: '主件', price: '', twoWay: true }, { partId: 'P0007', role: '替代品', price: 200, twoWay: true }
    ] },
    { id: 'U0002', code: 'U-OILF-TOY', name: '豐田機油濾通用組', note: '', sort: 2, active: true, members: [
      { partId: 'P0002', role: '主件', price: '', twoWay: false }
    ] }
  ];

  // 供應商供貨對應（supplierId → 供貨料件清單）
  var supplyMap = {
    S0001: [
      { partId: 'P0001', vendorPn: 'BOSCH-06L', price: 260, lead: 14, moq: 10, primary: true, from: '手動', start: '2025-01-01' },
      { partId: 'P0003', vendorPn: 'BOSCH-DB1521', price: 680, lead: 21, moq: 5, primary: true, from: '手動', start: '2025-01-01' },
      { partId: 'P0005', vendorPn: 'BOSCH-56219', price: 1450, lead: 30, moq: 4, primary: false, from: '系統', start: '2025-03-01' }
    ],
    S0002: [
      { partId: 'P0007', vendorPn: 'NTN-C1011', price: 85, lead: 45, moq: 100, primary: true, from: '手動', start: '2025-02-01' }
    ]
  };

  // ---- 字典主檔（地區/國家/幣別/注音）----
  var regionList = [
    { id: 'N', code: 'N', name: '北部', sort: 1, active: true }, { id: 'C', code: 'C', name: '中部', sort: 2, active: true },
    { id: 'S', code: 'S', name: '南部', sort: 3, active: true }, { id: 'E', code: 'E', name: '東部', sort: 4, active: true },
    { id: 'I', code: 'I', name: '離島', sort: 5, active: true }
  ];
  var countryList = [
    { id: 'TW', code: 'TW', name: '台灣', sort: 1, active: true }, { id: 'JP', code: 'JP', name: '日本', sort: 2, active: true },
    { id: 'DE', code: 'DE', name: '德國', sort: 3, active: true }, { id: 'US', code: 'US', name: '美國', sort: 4, active: true },
    { id: 'CN', code: 'CN', name: '中國', sort: 5, active: true }, { id: 'KR', code: 'KR', name: '韓國', sort: 6, active: true }
  ];
  var currencyList = [
    { id: 'TWD', code: 'TWD', name: '新台幣', symbol: 'NT$', decimals: 2, sort: 1, active: true },
    { id: 'USD', code: 'USD', name: '美金', symbol: '$', decimals: 2, sort: 2, active: true },
    { id: 'JPY', code: 'JPY', name: '日圓', symbol: '¥', decimals: 0, sort: 3, active: true },
    { id: 'EUR', code: 'EUR', name: '歐元', symbol: '€', decimals: 2, sort: 4, active: true },
    { id: 'CNY', code: 'CNY', name: '人民幣', symbol: '¥', decimals: 2, sort: 5, active: true }
  ];
  var zhuyinList = [
    { id: 'z1', char: '陳', zhuyin: 'ㄔㄣˊ', initial: 'ㄔ', active: true }, { id: 'z2', char: '林', zhuyin: 'ㄌㄧㄣˊ', initial: 'ㄌ', active: true },
    { id: 'z3', char: '王', zhuyin: 'ㄨㄤˊ', initial: 'ㄨ', active: true }, { id: 'z4', char: '油', zhuyin: 'ㄧㄡˊ', initial: 'ㄧ', active: true },
    { id: 'z5', char: '濾', zhuyin: 'ㄌㄩˋ', initial: 'ㄌ', active: true }, { id: 'z6', char: '煞', zhuyin: 'ㄕㄚ', initial: 'ㄕ', active: true },
    { id: 'z7', char: '盤', zhuyin: 'ㄆㄢˊ', initial: 'ㄆ', active: true }
  ];

  // ---- 推導（支援一人多職）----
  function byId(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
  function rolesOf(emp) { return (emp.roleIds || []).map(function (id) { return byId(roles, id); }).filter(Boolean); }
  function roleOf(emp) { var rs = rolesOf(emp); return rs[0] || null; } // 主職務（第一個）
  function groupOfRole(role) { return role ? byId(groups, role.group) : null; }
  function deptOfGroup(g) { return g ? byId(depts, g.dept) : null; }

  window.NXDB = {
    dict: dict, depts: depts, groups: groups, roles: roles, emps: emps,
    sites: sites, warehouses: warehouses, bins: bins, whTypes: whTypes,
    partners: partners, custGrades: custGrades, suppGrades: suppGrades, partnerTypes: partnerTypes,
    regionList: regionList, countryList: countryList, currencyList: currencyList, zhuyinList: zhuyinList,
    brands: brands, partGroups: partGroups, parts: parts, univGroups: univGroups, supplyMap: supplyMap,
    seatLimit: 10,
    byId: byId, roleOf: roleOf, rolesOf: rolesOf, groupOfRole: groupOfRole, deptOfGroup: deptOfGroup,
    empSite: function (e) { var s = e && e.siteId ? byId(sites, e.siteId) : null; return s ? s.name : '（未指派）'; },
    // 員工的部門/組/職務名稱（唯讀推導，以主職務為準）
    empDept: function (e) { var d = deptOfGroup(groupOfRole(roleOf(e))); return d ? d.name : '—'; },
    empGroup: function (e) { var g = groupOfRole(roleOf(e)); return g ? g.name : '—'; },
    empRole: function (e) { var rs = rolesOf(e); if (!rs.length) return '（未指派）'; return rs[0].name + (rs.length > 1 ? '＋' + (rs.length - 1) : ''); },
    empRoleNames: function (e) { return rolesOf(e).map(function (r) { return r.name; }); },
    seatUsed: function () { return emps.filter(function (e) { return e.active; }).length; }
  };
})();
