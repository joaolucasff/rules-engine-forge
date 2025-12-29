# 📊 GRÁFICOS 3D - MEGATELA FLORIPA SQUARE

Visualizações 3D de superfície para análise de Audiência e Frequência ao longo de 30 dias.

## 📁 Arquivos Inclusos

- `grafico_3d_plotly.py` - Gráfico interativo (HTML) com Plotly
- `grafico_3d_matplotlib.py` - Gráficos estáticos (PNG) com Matplotlib
- `requirements.txt` - Dependências do projeto
- `README.md` - Este arquivo

---

## 🚀 Instalação

### 1. **Criar Ambiente Virtual (Recomendado)**

```bash
# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate
```

### 2. **Instalar Dependências**

```bash
pip install -r requirements.txt
```

**OU instalar manualmente:**

```bash
# Para gráfico interativo (Plotly)
pip install plotly kaleido pandas numpy

# Para gráficos estáticos (Matplotlib)
pip install matplotlib numpy

# Instalar tudo de uma vez
pip install plotly kaleido matplotlib numpy pandas
```

---

## 📊 Uso

### **Opção 1: Gráfico Interativo (Plotly)**

```bash
python grafico_3d_plotly.py
```

**Gera:**
- `grafico_3d_megatela_interativo.html` - Abra no navegador
- `grafico_3d_megatela_4k.png` - Imagem estática 4K

**Recursos:**
- ✅ Rotação 360° com mouse
- ✅ Zoom interativo
- ✅ Hover com valores
- ✅ Export PNG direto do navegador

---

### **Opção 2: Gráficos Estáticos (Matplotlib)**

```bash
python grafico_3d_matplotlib.py
```

**Gera 6 imagens PNG:**
1. `grafico_3d_megatela_isometrico.png` - Vista padrão
2. `grafico_3d_megatela_frontal.png` - Vista frontal
3. `grafico_3d_megatela_lateral.png` - Vista lateral
4. `grafico_3d_megatela_superior.png` - Vista de cima
5. `grafico_3d_megatela_perspectiva.png` - Perspectiva
6. `grafico_3d_megatela_4K.png` - Versão ultra HD (DPI 400)

**Recursos:**
- ✅ Alta qualidade (300-400 DPI)
- ✅ Múltiplos ângulos
- ✅ Pronto para impressão
- ✅ Ideal para relatórios

---

## 🎨 Personalização

### **Alterar Dados**

Edite o dicionário `dados_grafico` em qualquer script:

```python
dados_grafico = {
    'dias': [1, 2, 3, ...],
    'audiencia': [337013, 559702, ...],
    'frequencia': [3.6, 4.33, ...]
}
```

### **Alterar Cores**

**Plotly (`grafico_3d_plotly.py`):**
```python
colorscale=[
    [0.0, 'rgb(13, 71, 161)'],   # Azul
    [1.0, 'rgb(183, 28, 28)']    # Vermelho
]
```

**Matplotlib (`grafico_3d_matplotlib.py`):**
```python
cores = [
    '#0D47A1',  # Azul escuro
    '#B71C1C'   # Vermelho
]
```

### **Alterar Resolução**

**Plotly:**
```python
fig.write_image('arquivo.png', width=3200, height=2400)
```

**Matplotlib:**
```python
fig = plt.figure(figsize=(20, 14), dpi=300)
```

---

## 📐 Ângulos de Visualização

### **Matplotlib - Função `view_init()`**

```python
ax.view_init(elev=25, azim=45)
```

**Ângulos Pré-definidos:**
- Isométrico: `(25, 45)`
- Frontal: `(15, 0)`
- Lateral: `(15, 90)`
- Superior: `(85, 45)`
- Perspectiva: `(30, 60)`

### **Plotly - Camera Settings**

```python
camera=dict(
    eye=dict(x=1.5, y=1.5, z=1.3)
)
```

---

## 🐛 Troubleshooting

### **Erro: "No module named 'plotly'"**
```bash
pip install plotly
```

### **Erro: "No module named 'kaleido'"**
```bash
pip install kaleido
```

### **Erro ao salvar PNG no Plotly**
```bash
# Instalar kaleido
pip install kaleido

# OU usar formato SVG
fig.write_image('arquivo.svg')
```

### **Gráfico não aparece no Matplotlib**
```bash
# Adicionar ao final do script
plt.show()
```

### **Baixa qualidade na imagem**
```python
# Aumentar DPI
fig = plt.figure(dpi=400)  # Matplotlib
fig.write_image('arquivo.png', scale=4)  # Plotly
```

---

## 📊 Comparação: Plotly vs Matplotlib

| Recurso | Plotly | Matplotlib |
|---------|--------|------------|
| **Interatividade** | ✅ Rotação, zoom, hover | ❌ Estático |
| **Qualidade** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Tamanho arquivo** | 📁 Grande (HTML) | 📁 Pequeno (PNG) |
| **Uso em apresentações** | ✅ Interativo | ✅ Imagem |
| **Uso em relatórios** | ⚠️ Difícil | ✅ Perfeito |
| **Customização** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Velocidade** | 🐇 Rápido | 🐢 Mais lento |

**Recomendação:**
- **Apresentações digitais** → Use Plotly
- **Relatórios impressos** → Use Matplotlib
- **Melhor dos dois mundos** → Use ambos!

---

## 💡 Dicas de Uso

### **PowerPoint/Keynote**
1. Plotly: Exportar HTML e inserir como objeto web
2. Matplotlib: Inserir PNG de alta qualidade

### **Relatórios PDF**
Use as imagens PNG do Matplotlib (300+ DPI)

### **Sites/Dashboards**
Use o HTML do Plotly (totalmente interativo)

### **Impressão**
Use PNG 4K do Matplotlib (DPI 400)

---

## 📚 Documentação

- **Plotly:** https://plotly.com/python/
- **Matplotlib:** https://matplotlib.org/
- **NumPy:** https://numpy.org/

---

## 🎯 Próximos Passos

- [ ] Adicionar animação temporal (evolução dia a dia)
- [ ] Implementar dashboard interativo com Dash
- [ ] Adicionar mais métricas (alcance, impacto, etc)
- [ ] Criar versão com projeção real dos dados
- [ ] Exportar para formatos 3D (STL, OBJ)

---

## 📞 Suporte

Em caso de dúvidas ou problemas:
1. Verificar seção de Troubleshooting
2. Conferir documentação oficial das bibliotecas
3. Revisar os comentários no código

---

## 📄 Licença

© 2025 Floripa Square - Todos os direitos reservados

---

**Desenvolvido com ❤️ para Megatela Floripa Square**
