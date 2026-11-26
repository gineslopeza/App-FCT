"""Excel de demostración con DATOS INVENTADOS y la misma estructura que el Excel compartido de FCT.

Sirve para probar la app y para las capturas sin tocar datos reales.
Uso: python3 -I scripts/demo.py public/demo/FCT_demo.xlsx
"""
import datetime as dt
import random
import sys

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.table import Table, TableStyleInfo

random.seed(2627)
DEST = sys.argv[1]

CAB_ALUMNO = ['NOMBRE', 'APELLIDO 1', 'APELLIDO 2', 'GRUPO', 'NIA', 'NIF / NIE', 'NUSS', 'SEXO', 'FECHA NACIMIENTO', 'EDAD', 'NACIONALIDAD', 'EMAIL', 'PROCEDENCIA',
              'PROGRESO', 'NUSS ALUMNO', 'EMPRESA ASIGNADA', 'EMPRESA EN SAO', 'CONVENIO EN VIGOR', 'CONVENIO FIRMADO POR DIRECCIÓN', 'CONVENIO FIRMADO POR EMPRESA',
              'CONVENIO SUBIDO A SAO', 'FORMACIÓN CREADA EN SAO', 'FORMACIÓN FIRMADA POR TUTOR', 'FORMACIÓN FIRMADA POR DIRECCIÓN', 'FORMACIÓN AUTORIZADA',
              'FORMACIÓN FIRMADA POR ALUMNO', 'FORMACIÓN FIRMADA POR EMPRESA', 'ASIGNADOS RA', 'GESTIÓN COMPLETA', 'DEPARTAMENTO PRÁCTICAS',
              'NOMBRE EMPRESA', 'CIF', 'DEPARTAMENTO', 'DIRECCIÓN', 'TELÉFONO', 'FAX', 'E-MAIL EMPRESA', 'ACTIVIDAD PRINCIPAL', 'HORARIO GENERAL',
              'NOMBRE Y APELLIDOS GERENTE', 'DNI GERENTE', 'E-MAIL GERENTE', 'NOMBRE Y APELLIDOS INSTRUCTOR/A', 'DNI INSTRUCTOR/A', 'E-MAIL INSTRUCTOR/A',
              'FECHA INICIO', 'FECHA FIN', 'HORAS', 'OBSERVACIONES', 'TUTOR FE']
NOMBRES = ['Lucía', 'Hugo', 'Martina', 'Mateo', 'Sofía', 'Leo', 'Valeria', 'Pau', 'Carla', 'Marc', 'Noa', 'Izan', 'Aitana', 'Álex', 'Julia', 'Dani', 'Vega', 'Unai',
           'Ainhoa', 'Bruno', 'Laia', 'Iker', 'Ona', 'Nil', 'Irene', 'Jan', 'Lola', 'Gael']
APELLIDOS = ['Ferrer', 'Soler', 'Navarro', 'Ortega', 'Pascual', 'Vidal', 'Molina', 'Castro', 'Rubio', 'Marín', 'Serra', 'Gil', 'Blasco', 'Llorens', 'Peris',
             'Mora', 'Climent', 'Aparisi', 'Sanchis', 'Bosch', 'Romero', 'Esteve', 'Tormo', 'Roig']
EMPRESAS = [
    ('Redes Ribera SL', 'B00000001', 'Telecomunicaciones', 'Alzira', 'SMR, DAM', 'Contactar', 4, '24/25, 25/26'),
    ('Software Xúquer SL', 'B00000002', 'Desarrollo de software', 'Alzira', 'DAM', 'Asignada', 3, '25/26'),
    ('Ayuntamiento de Ejemplo', 'P0000003A', 'Administración pública', 'Carcaixent', 'SMR', 'Disponible', 2, '23/24, 24/25, 25/26'),
    ('Clínica Demo', 'B00000004', 'Sanidad', 'Algemesí', 'SMR', 'Pendiente respuesta', 2, ''),
    ('Tienda Informática Sur', 'B00000005', 'Comercio de equipos', 'Sueca', 'SMR, FPB', 'Asignada', 3, '24/25'),
    ('Estudio Web Naranja', 'B00000006', 'Diseño web', 'Alzira', 'DAM', 'Contactar', 2, '25/26'),
    ('Cooperativa Agrícola Demo', 'F00000007', 'Agroalimentaria', 'Guadassuar', 'SMR, FPB', 'Disponible', 2, '22/23'),
    ('Centro de Datos Valle', 'B00000008', 'Servicios TIC', 'Alzira', 'SMR, DAM', 'No disponible', 0, '24/25'),
    ('Academia Pixel', 'B00000009', 'Formación', 'Alzira', 'DAM, SMR', 'Asignada', 2, ''),
    ('Hotel Costa Demo', 'B00000010', 'Hostelería', 'Cullera', 'SMR', 'Contactar', 1, '23/24'),
]
PROFES = ['MARTA', 'PABLO', 'SONIA', 'ÓSCAR', 'IRENE', 'RAÚL', 'NURIA']
CURSOS = {  # curso: (nº alumnos, inicio, fin, horas, previstos)
    '1DAM': (18, dt.date(2027, 4, 12), dt.date(2027, 5, 28), 150, 20),
    '1TSMR': (20, dt.date(2027, 4, 12), dt.date(2027, 5, 28), 150, None),
    '2DAM': (12, dt.date(2026, 12, 14), dt.date(2027, 3, 12), 400, None),
    '2FPB': (10, dt.date(2027, 3, 1), dt.date(2027, 5, 21), 240, 11),
    '2TSMR': (16, dt.date(2027, 3, 1), dt.date(2027, 5, 25), 400, None),
}
HORAS = {
    '1DAM': [('MARTA', 8), ('PABLO', 8), ('SONIA', 5), ('ÓSCAR', 4), ('IRENE', 3), ('RAÚL', 2)],
    '1TSMR': [('NURIA', 11), ('ÓSCAR', 7), ('PABLO', 7), ('IRENE', 3), ('RAÚL', 2)],
    '2DAM': [('SONIA', 11), ('MARTA', 8), ('PABLO', 4), ('IRENE', 3), ('RAÚL', 1)],
    '2FPB': [('ÓSCAR', 8), ('MARTA', 8), ('NURIA', 5), ('RAÚL', 5), ('IRENE', 2)],
    '2TSMR': [('MARTA', 8), ('SONIA', 7), ('ÓSCAR', 5), ('PABLO', 3), ('RAÚL', 3), ('IRENE', 3)],
}
AZUL, BLANCO = PatternFill('solid', fgColor='1F4E78'), Font(bold=True, color='FFFFFF')
AMARILLO = PatternFill('solid', fgColor='FFF2CC')

wb = Workbook()
wb.remove(wb.active)

def hoja_curso(nombre, curso, n, ini, fin, horas, anterior=False):
    ws = wb.create_sheet(nombre)
    ws['A1'] = f'FCT {"2025-2026" if anterior else "2026-2027"} · {curso}'
    ws['A1'].font = Font(bold=True, size=14)
    for col, txt in ((1, 'DATOS ALUMNO'), (14, 'PROGRESO'), (15, 'ESTADO DE LA TRAMITACIÓN'), (31, 'DATOS FORMACIÓN'), (49, 'OBSERVACIONES')):
        ws.cell(2, col, txt).font = Font(bold=True)
    for i, h in enumerate(CAB_ALUMNO, 1):
        c = ws.cell(3, i, h); c.fill = AZUL; c.font = BLANCO; c.alignment = Alignment(wrap_text=True, vertical='center')
    ws.row_dimensions[3].height = 48
    profes = [p for p, _ in HORAS.get(curso, [])]
    usados = set()
    for k in range(n):
        r = 4 + k
        while True:
            nom, a1, a2 = random.choice(NOMBRES), random.choice(APELLIDOS), random.choice(APELLIDOS)
            if (nom, a1) not in usados: usados.add((nom, a1)); break
        nac = dt.date(random.choice([2005, 2006, 2007, 2008, 2009]), random.randint(1, 12), random.randint(1, 28))
        fila = [nom, a1, a2, curso[0] + 'CF', 90000000 + random.randint(1, 999999), f'0000{random.randint(1000, 9999)}X', '' if random.random() < 0.12 else f'46/0000{random.randint(1000, 9999)}/00',
                random.choice(['HOMBRE', 'MUJER']), nac, None, 'Española', f'alumno{k + 1}.{curso.lower()}@ejemplo.invalid', '']
        for i, v in enumerate(fila, 1):
            ws.cell(r, i, v)
        ws.cell(r, 9).number_format = 'dd/mm/yyyy'
        ws.cell(r, 10, f'=IF(I{r}="","",DATEDIF(I{r},TODAY(),"Y"))')
        ws.cell(r, 14, f'=IF($A{r}="","",COUNTIF(O{r}:AD{r},TRUE)/16)')
        avance = random.choice([0, 0, 1, 2, 4, 7, 9, 13]) if not anterior else 16
        emp = random.choice(EMPRESAS)[0] if avance >= 1 or random.random() < 0.3 else ''
        for j in range(16):
            ws.cell(r, 15 + j, j < avance or (j == 0 and bool(fila[6])))
        if emp:
            ws.cell(r, 31, emp)
        ws.cell(r, 46, ini); ws.cell(r, 47, fin); ws.cell(r, 48, horas)
        ws.cell(r, 46).number_format = ws.cell(r, 47).number_format = 'dd/mm/yyyy'
        if profes and random.random() < 0.45:
            ws.cell(r, 50, random.choice(profes))
        if random.random() < 0.2:
            ws.cell(r, 49, random.choice(['Busca empresa por su cuenta.', 'Prefiere empresa cerca de casa.', 'Pendiente de entrevista.', 'Ha aportado contacto de la empresa.']))
    dv = DataValidation(type='list', formula1="'ALUMNOS POR PERSONA'!$A$47:$A$53", allow_blank=True)
    ws.add_data_validation(dv); dv.add('AX4:AX300')
    ws.freeze_panes = 'D4'
    for i, w in enumerate([14, 14, 14, 7, 11, 12, 15, 9, 12, 6, 12, 30], 1):
        ws.column_dimensions[chr(64 + i)].width = w
    return ws

hoja_curso('2GMNTL 25_26', '2GMNTL', 14, dt.date(2026, 3, 2), dt.date(2026, 5, 22), 400, anterior=True)
for c, (n, ini, fin, h, _) in CURSOS.items():
    hoja_curso(f'{c} 26_27', c, n, ini, fin, h)

# Reparto
ws = wb.create_sheet('ALUMNOS POR PERSONA')
ws['A1'] = 'REPARTO DEL ALUMNADO DE FE ENTRE EL PROFESORADO · 2026-2027 (DATOS INVENTADOS)'; ws['A1'].font = Font(bold=True, size=14)
ws['A3'] = '1. CURSOS'
cab = ['CURSO', 'HOJA', 'COL. ALUMNO', 'FILA INICIO', 'COL. TUTOR', 'COL. EMPRESA', 'EN LA HOJA', 'PREVISTOS', 'A REPARTIR']
for i, h in enumerate(cab, 1): ws.cell(4, i, h)
for k, (c, (n, *_r, prev)) in enumerate(CURSOS.items()):
    r = 5 + k
    for i, v in enumerate([c, f'{c} 26_27', 'A', 4, 'AX', 'AE'], 1): ws.cell(r, i, v)
    ws.cell(r, 7, f"=COUNTA(INDIRECT(\"'\"&B{r}&\"'!A4:A300\"))")
    ws.cell(r, 8, prev).fill = AMARILLO
    ws.cell(r, 9, f'=IF(H{r}<>"",H{r},G{r})')
ws.add_table(Table(displayName='Tabla4', ref='A4:I9', tableStyleInfo=TableStyleInfo(name='TableStyleLight9', showRowStripes=True)))
ws['A11'] = '2. REPARTO POR PROFESOR Y CURSO'
cabr = ['CURSO', 'PROFESOR', 'CÓDIGO HORARIO', 'HORAS/SEMANA', 'PESO', 'HORAS PONDERADAS', 'AJUSTE']
for i, h in enumerate(cabr, 1): ws.cell(12, i, h)
r = 13
for c, fs in HORAS.items():
    for p, h in fs:
        ws.cell(r, 1, c); ws.cell(r, 2, p); ws.cell(r, 3, p.capitalize()); ws.cell(r, 4, h).fill = AMARILLO; ws.cell(r, 5, 1).fill = AMARILLO
        ws.cell(r, 6, f'=D{r}*E{r}'); ws.cell(r, 7).fill = AMARILLO
        r += 1
ws.add_table(Table(displayName='Tabla1', ref=f'A12:G{r - 1}', tableStyleInfo=TableStyleInfo(name='TableStyleLight9', showRowStripes=True)))
ws['A45'] = '3. RESUMEN POR PROFESOR'
ws['A46'] = 'PROFESOR'
for k, p in enumerate(PROFES): ws.cell(47 + k, 1, p)

# Empresas
ws = wb.create_sheet('EMPRESAS')
ws['A1'] = 'REGISTRO DE EMPRESAS FCT (DATOS INVENTADOS)'; ws['A1'].font = Font(bold=True, size=14)
cabe = ['EMPRESA', 'CIF', 'SECTOR / ACTIVIDAD', 'LOCALIDAD', 'DIRECCIÓN', 'PERSONA CONTACTO', 'CARGO', 'TELÉFONO', 'EMAIL', 'CICLOS QUE ACEPTA',
        'CURSOS QUE HA COLABORADO', 'PLAZAS 26/27', '1DAM', '2DAM', '1TSMR', '2TSMR', '2FPB', 'TOTAL ASIGNADOS', 'PLAZAS LIBRES', 'ESTADO', 'OBSERVACIONES',
        'ÚLTIMO CONTACTO', 'RESPONSABLE', 'PRÓXIMA ACCIÓN', 'FECHA PRÓXIMA ACCIÓN', 'HAY QUE HABLAR']
for i, h in enumerate(cabe, 1): ws.cell(3, i, h)
for k, (nom, cif, sector, loc, ciclos, estado, plazas, cursos) in enumerate(EMPRESAS):
    r = 4 + k
    vals = [nom, cif, sector, loc, f'Calle Inventada {k + 1}, {loc}', random.choice(['Persona de contacto A', 'Persona de contacto B', 'Responsable de RR. HH.']),
            random.choice(['Gerente', 'Técnico/a', 'RR. HH.']), f'600 000 {k:03d}', f'contacto{k + 1}@empresa.invalid', ciclos, cursos, plazas]
    for i, v in enumerate(vals, 1): ws.cell(r, i, v)
    for i, c in enumerate(['1DAM', '2DAM', '1TSMR', '2TSMR', '2FPB']):
        col = 13 + i
        ws.cell(r, col, f"=COUNTIF('{c} 26_27'!$AE$4:$AE$300,$A{r})")
    ws.cell(r, 18, f'=SUM(M{r}:Q{r})'); ws.cell(r, 19, f'=IF(L{r}="","",L{r}-R{r})')
    ws.cell(r, 20, estado)
    if k in (0, 3, 5):
        ws.cell(r, 22, dt.date(2026, 11, 10 + k)); ws.cell(r, 23, random.choice(PROFES))
        ws.cell(r, 24, ['Llamar para confirmar plazas', 'Esperar respuesta del correo', 'Enviar convenio'][k % 3])
        ws.cell(r, 25, dt.date(2026, 11, 20) + dt.timedelta(days=k * 3))
        ws.cell(r, 21, '10/11/26 MARTA: primer contacto por teléfono.')
    ws.cell(r, 26, f'=IF(OR(T{r}="Contactar",T{r}="Pendiente respuesta",AND(ISNUMBER(Y{r}),Y{r}<=TODAY())),"Sí","")')
    for col in (22, 25): ws.cell(r, col).number_format = 'dd/mm/yyyy'
ws.add_table(Table(displayName='Tabla5', ref=f'A3:Z{3 + len(EMPRESAS)}', tableStyleInfo=TableStyleInfo(name='TableStyleMedium2', showRowStripes=True)))
dv = DataValidation(type='list', formula1='"Asignada,Contactar,Disponible,Pendiente respuesta,No disponible"', allow_blank=True)
ws.add_data_validation(dv); dv.add('T4:T500')
wb.save(DEST)
print('OK', DEST)
