from pathlib import Path
from zipfile import ZipFile
import csv,io,struct,xml.etree.ElementTree as ET

ROOT=Path(__file__).parent
NS={'x':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
for scope,expected,numeric_expected in [('all',20,19),('filtered',7,6)]:
  with (ROOT/f'sample-{scope}.csv').open('r',encoding='utf-8-sig',newline='') as f:
    csvrows=list(csv.reader(f,delimiter=';'))
  assert len(csvrows)==expected+1 and all(len(r)==22 for r in csvrows),(scope,'CSV grain')
  assert csvrows[0][0]=='CNPJ'
  assert all(len(r[0])==14 for r in csvrows[1:])
  assert all(r[10] for r in csvrows[1:])
  print('CSV_'+scope.upper()+'_ROWS='+str(expected)+'_PASS')

  with ZipFile(ROOT/f'sample-{scope}.xlsx') as z:
    assert z.testzip() is None
    sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    nodes=sheet.findall('.//x:sheetData/x:row',NS)
    assert len(nodes)==expected+1
    cells={c.attrib['r']:c for c in sheet.findall('.//x:sheetData/x:row/x:c',NS)}
    for ri,rec in enumerate(csvrows[1:],start=2):
      cnpj=cells[f'A{ri}']
      assert cnpj.attrib.get('t')=='inlineStr'
      assert ''.join(cnpj.itertext())==rec[0]
      money=cells[f'K{ri}']
      if ri==4:
        assert money.attrib.get('t')=='inlineStr' and 'not-amount' in ''.join(money.itertext())
      else:
        assert money.attrib.get('t')=='n' and money.attrib.get('s')=='2'
        n=float(money.find('x:v',NS).text)
        assert n>=0
    assert sum(c.attrib.get('t')=='n' for k,c in cells.items() if k.startswith('K'))==numeric_expected
  print('XLSX_'+scope.upper()+'_CELL_TYPES='+str(numeric_expected)+'_NUMERIC_PASS')

  b=(ROOT/f'sample-{scope}.xls').read_bytes()
  assert b[:8]==bytes.fromhex('D0CF11E0A1B11AE1')
  directory_start=struct.unpack_from('<I',b,48)[0]
  directory_offset=512*(directory_start+1)
  assert b[directory_offset+128:directory_offset+144].decode('utf-16le').startswith('Workbook')
  wb_start=512
  off=wb_start
  bofs=eofs=number_records=sst_cells=0
  while off+4 <= len(b):
    kind,size=struct.unpack_from('<HH',b,off)
    assert size<=8224 and off+4+size<=len(b),(scope,'BIFF length',kind,size)
    payload=b[off+4:off+4+size]
    if kind==0x0809:bofs+=1
    if kind==0x000A:
      eofs+=1
      if eofs==2:break
    if kind==0x0203:
      row,col,xf=struct.unpack_from('<HHH',payload)
      n=struct.unpack_from('<d',payload,6)[0]
      assert col==10 and 1<=row<=expected and xf==1 and n>=0
      number_records+=1
    if kind==0x00FD:sst_cells+=1
    off+=4+size
  assert bofs==2 and eofs==2
  assert number_records==numeric_expected,(scope,number_records,numeric_expected)
  assert sst_cells>expected
  print('XLS_'+scope.upper()+'_BIFF_NUMBERS='+str(number_records)+'_PASS')
print('EX_EXPORT_02_04_STRUCTURAL_QA=GREEN')
