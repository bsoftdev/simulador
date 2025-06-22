document.addEventListener('DOMContentLoaded', function() {
    // Configurações iniciais
    const config = {
        speed: 5,
        isRunning: false,
        isPaused: false,
        currentStep: 0,
        controlType: 'hardwired',
        pipelineMode: false,
        darkMode: false,
        simulationInterval: null
    };

    // Estado do processador
    const processorState = {
        pc: 0,
        ir: '',
        registers: new Array(32).fill(0),
        memory: new Array(256).fill(0),
        controlSignals: {
            RegDst: false,
            Jump: false,
            Branch: false,
            MemRead: false,
            MemToReg: false,
            ALUOp: 0,
            MemWrite: false,
            ALUSrc: false,
            RegWrite: false
        },
        pipeline: {
            IF: { active: false, instruction: '' },
            ID: { active: false, instruction: '' },
            EX: { active: false, instruction: '' },
            MEM: { active: false, instruction: '' },
            WB: { active: false, instruction: '' }
        }
    };

    // Programas de exemplo
    const samplePrograms = {
        sum: "addi $t0, $zero, 5\naddi $t1, $zero, 10\nadd $t2, $t0, $t1",
        factorial: "addi $t0, $zero, 5\naddi $t1, $zero, 1\nloop:\nmul $t1, $t1, $t0\naddi $t0, $t0, -1\nbne $t0, $zero, loop",
        fibonacci: "addi $t0, $zero, 10\naddi $t1, $zero, 0\naddi $t2, $zero, 1\nloop:\nadd $t3, $t1, $t2\nadd $t1, $zero, $t2\nadd $t2, $zero, $t3\naddi $t0, $t0, -1\nbne $t0, $zero, loop"
    };

    // Mapeamento de registradores
    const registerMap = {
        '$zero': 0, '$at': 1, '$v0': 2, '$v1': 3,
        '$a0': 4, '$a1': 5, '$a2': 6, '$a3': 7,
        '$t0': 8, '$t1': 9, '$t2': 10, '$t3': 11,
        '$t4': 12, '$t5': 13, '$t6': 14, '$t7': 15,
        '$s0': 16, '$s1': 17, '$s2': 18, '$s3': 19,
        '$s4': 20, '$s5': 21, '$s6': 22, '$s7': 23,
        '$t8': 24, '$t9': 25, '$k0': 26, '$k1': 27,
        '$gp': 28, '$sp': 29, '$fp': 30, '$ra': 31
    };

    // Elementos da interface
    const elements = {
        runBtn: document.getElementById('runBtn'),
        pauseBtn: document.getElementById('pauseBtn'),
        stepBtn: document.getElementById('stepBtn'),
        resetBtn: document.getElementById('resetBtn'),
        speedControl: document.getElementById('speedControl'),
        controlType: document.getElementById('controlType'),
        pipelineToggle: document.getElementById('pipelineToggle'),
        darkModeToggle: document.getElementById('darkModeToggle'),
        samplePrograms: document.getElementById('samplePrograms'),
        codeEditor: document.getElementById('codeEditor'),
        loadCodeBtn: document.getElementById('loadCodeBtn'),
        controlSignals: document.getElementById('controlSignals'),
        registersDisplay: document.getElementById('registersDisplay'),
        pipelineDisplay: document.getElementById('pipelineDisplay'),
        executionLog: document.getElementById('executionLog'),
        processorDiagram: document.getElementById('processorDiagram')
    };

    // Inicialização
    initSimulator();

    function initSimulator() {
        initControlSignals();
        initRegisters();
        initPipeline();
        drawProcessorDiagram();
        setupEventListeners();
        logExecution("Simulador inicializado. Carregue um programa para começar.");
    }

    function initControlSignals() {
        elements.controlSignals.innerHTML = '';
        
        Object.keys(processorState.controlSignals).forEach(signal => {
            const div = document.createElement('div');
            div.className = 'control-signal';
            div.id = `signal-${signal}`;
            div.textContent = signal;
            elements.controlSignals.appendChild(div);
        });
    }

    function initRegisters() {
        elements.registersDisplay.innerHTML = '';
        
        // Mostrar apenas os registradores mais comuns
        const displayRegisters = ['$zero', '$t0', '$t1', '$t2', '$t3', '$s0', '$s1', '$a0', '$a1', '$v0', '$v1', '$sp'];
        
        displayRegisters.forEach(reg => {
            const regNum = registerMap[reg];
            const div = document.createElement('div');
            div.className = 'register';
            div.id = `reg-${regNum}`;
            div.innerHTML = `${reg}: <span>0</span>`;
            elements.registersDisplay.appendChild(div);
        });
    }

    function initPipeline() {
        elements.pipelineDisplay.innerHTML = '';
        
        const stages = ['IF', 'ID', 'EX', 'MEM', 'WB'];
        stages.forEach(stage => {
            const div = document.createElement('div');
            div.className = 'pipeline-stage';
            div.id = `stage-${stage}`;
            div.textContent = stage;
            elements.pipelineDisplay.appendChild(div);
        });
    }

    function drawProcessorDiagram() {
        elements.processorDiagram.innerHTML = '';
        
        const width = elements.processorDiagram.clientWidth;
        const height = 400;
        
        const svg = d3.select(elements.processorDiagram)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        
        // Componentes principais
        const components = [
            { id: 'pc', x: width * 0.1, y: height * 0.2, width: 80, height: 40, text: 'PC' },
            { id: 'memory', x: width * 0.3, y: height * 0.2, width: 100, height: 60, text: 'Memória' },
            { id: 'registers', x: width * 0.3, y: height * 0.5, width: 100, height: 60, text: 'Registradores' },
            { id: 'alu', x: width * 0.6, y: height * 0.35, width: 80, height: 50, text: 'ALU' },
            { id: 'control', x: width * 0.8, y: height * 0.5, width: 100, height: 60, text: 'Unidade\n de Controle' },
            { id: 'ir', x: width * 0.1, y: height * 0.5, width: 80, height: 40, text: 'IR' }
        ];
        
        // Desenhar componentes
        components.forEach(comp => {
            svg.append('rect')
                .attr('x', comp.x)
                .attr('y', comp.y)
                .attr('width', comp.width)
                .attr('height', comp.height)
                .attr('rx', 5)
                .attr('ry', 5)
                .attr('class', 'component')
                .attr('id', `comp-${comp.id}`);
                
            svg.append('text')
                .attr('x', comp.x + comp.width / 2)
                .attr('y', comp.y + comp.height / 2)
                .attr('dy', '0.35em')
                .attr('class', 'component-text')
                .text(comp.text.split('\n')[0]);
                
            if (comp.text.includes('\n')) {
                svg.append('text')
                    .attr('x', comp.x + comp.width / 2)
                    .attr('y', comp.y + comp.height / 2 + 15)
                    .attr('dy', '0.35em')
                    .attr('class', 'component-text')
                    .text(comp.text.split('\n')[1]);
            }
        });
        
        // Conexões de dados
        const dataPaths = [
            { from: 'pc', to: 'memory' },
            { from: 'memory', to: 'ir' },
            { from: 'ir', to: 'registers' },
            { from: 'registers', to: 'alu' },
            { from: 'alu', to: 'registers' },
            { from: 'alu', to: 'memory' }
        ];
        
        // Conexões de controle
        const controlPaths = [
            { from: 'control', to: 'pc' },
            { from: 'control', to: 'memory' },
            { from: 'control', to: 'registers' },
            { from: 'control', to: 'alu' }
        ];
        
        // Desenhar conexões
        drawConnections(svg, dataPaths, components, 'data-path');
        drawConnections(svg, controlPaths, components, 'control-path');
    }
    
    function drawConnections(svg, paths, components, cssClass) {
        paths.forEach(path => {
            const from = components.find(c => c.id === path.from);
            const to = components.find(c => c.id === path.to);
            
            if (!from || !to) return;
            
            // Calcular pontos de conexão
            const fromX = from.x + from.width;
            const fromY = from.y + from.height / 2;
            const toX = to.x;
            const toY = to.y + to.height / 2;
            
            // Desenhar linha com seta
            const line = svg.append('path')
                .attr('d', `M${fromX},${fromY} C${fromX + 50},${fromY} ${toX - 50},${toY} ${toX},${toY}`)
                .attr('class', cssClass)
                .attr('id', `path-${path.from}-${path.to}`);
                
            // Adicionar seta
            const arrowSize = 6;
            const angle = Math.atan2(toY - fromY, toX - fromX);
            
            svg.append('path')
                .attr('d', `M${toX},${toY} L${toX - arrowSize * Math.cos(angle - Math.PI/6)},${toY - arrowSize * Math.sin(angle - Math.PI/6)} L${toX - arrowSize * Math.cos(angle + Math.PI/6)},${toY - arrowSize * Math.sin(angle + Math.PI/6)} Z`)
                .attr('class', cssClass);
        });
    }

    function setupEventListeners() {
        // Controles de execução
        elements.runBtn.addEventListener('click', runSimulation);
        elements.pauseBtn.addEventListener('click', pauseSimulation);
        elements.stepBtn.addEventListener('click', stepSimulation);
        elements.resetBtn.addEventListener('click', resetSimulation);
        
        // Configurações
        elements.speedControl.addEventListener('input', function() {
            config.speed = parseInt(this.value);
            logExecution(`Velocidade ajustada para: ${config.speed}`);
        });
        
        elements.controlType.addEventListener('change', function() {
            config.controlType = this.value;
            logExecution(`Tipo de controle alterado para: ${this.value === 'hardwired' ? 'Hardwired' : 'Microprogramado'}`);
        });
        
        elements.pipelineToggle.addEventListener('change', function() {
            config.pipelineMode = this.checked;
            logExecution(`Modo pipeline ${this.checked ? 'ativado' : 'desativado'}`);
        });
        
        elements.darkModeToggle.addEventListener('change', function() {
            config.darkMode = this.checked;
            document.body.classList.toggle('dark-mode', config.darkMode);
            logExecution(`Modo ${this.checked ? 'escuro' : 'claro'} ativado`);
        });
        
        // Editor de código
        elements.samplePrograms.addEventListener('change', function() {
            if (this.value && samplePrograms[this.value]) {
                elements.codeEditor.value = samplePrograms[this.value];
                logExecution(`Programa "${this.value}" carregado no editor`);
            }
        });
        
        elements.loadCodeBtn.addEventListener('click', loadCode);
        
        // Atalhos de teclado
        document.addEventListener('keydown', function(e) {
            if (e.key === 'F5' && !config.isRunning) {
                e.preventDefault();
                runSimulation();
            } else if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                if (config.isRunning) pauseSimulation();
            } else if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                if (!config.isRunning || config.isPaused) stepSimulation();
            } else if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                resetSimulation();
            }
        });
        
        // Redimensionamento responsivo
        window.addEventListener('resize', function() {
            drawProcessorDiagram();
        });
    }

    function runSimulation() {
        if (!config.isRunning) {
            config.isRunning = true;
            config.isPaused = false;
            elements.runBtn.disabled = true;
            elements.pauseBtn.disabled = false;
            elements.stepBtn.disabled = true;
            
            const speed = 1100 - (config.speed * 100);
            config.simulationInterval = setInterval(executeNextStep, speed);
            logExecution("Simulação iniciada (modo contínuo)");
        }
    }

    function pauseSimulation() {
        if (config.isRunning && !config.isPaused) {
            config.isPaused = true;
            clearInterval(config.simulationInterval);
            elements.pauseBtn.disabled = true;
            elements.runBtn.disabled = false;
            elements.stepBtn.disabled = false;
            logExecution("Simulação pausada");
        }
    }

    function stepSimulation() {
        if (!config.isRunning || config.isPaused) {
            executeNextStep();
        }
    }

    function resetSimulation() {
        clearInterval(config.simulationInterval);
        config.isRunning = false;
        config.isPaused = false;
        config.currentStep = 0;
        
        // Resetar estado do processador
        processorState.pc = 0;
        processorState.ir = '';
        processorState.registers.fill(0);
        processorState.memory.fill(0);
        
        // Resetar sinais de controle
        for (let signal in processorState.controlSignals) {
            processorState.controlSignals[signal] = false;
        }
        
        // Resetar pipeline
        for (let stage in processorState.pipeline) {
            processorState.pipeline[stage].active = false;
            processorState.pipeline[stage].instruction = '';
        }
        
        // Atualizar interface
        updateControlSignals();
        updateRegisters();
        updatePipeline();
        resetActivePaths();
        
        elements.runBtn.disabled = false;
        elements.pauseBtn.disabled = true;
        elements.stepBtn.disabled = false;
        
        logExecution("Simulação reiniciada");
    }

    function executeNextStep() {
        config.currentStep++;
        
        const code = elements.codeEditor.value;
        if (!code.trim()) {
            logExecution("Erro: Nenhum código para executar", true);
            pauseSimulation();
            return;
        }
        
        const instructions = code.split('\n').filter(line => line.trim());
        
        if (processorState.pc < instructions.length) {
            const instruction = instructions[processorState.pc].trim();
            processorState.ir = instruction;
            
            // Decodificar instrução
            decodeInstruction(instruction);
            
            // Atualizar pipeline
            updatePipelineState(instruction);
            
            // Executar instrução
            executeInstruction(instruction);
            
            processorState.pc++;
            
            // Atualizar interface
            updateControlSignals();
            updateRegisters();
            updatePipeline();
            highlightActivePaths(instruction);
            
            logExecution(`Ciclo ${config.currentStep}: Executando "${instruction}"`);
        } else {
            // Fim do programa
            pauseSimulation();
            logExecution("Programa concluído");
        }
    }

    function decodeInstruction(instruction) {
        // Resetar sinais
        for (let signal in processorState.controlSignals) {
            processorState.controlSignals[signal] = false;
        }
        
        const op = instruction.split(' ')[0].toLowerCase();
        
        // Definir sinais baseados no tipo de instrução (simplificado)
        if (op.startsWith('add') || op.startsWith('sub') || op.startsWith('and') || op.startsWith('or')) {
            // Tipo R
            processorState.controlSignals.RegDst = true;
            processorState.controlSignals.ALUOp = 2;
            processorState.controlSignals.RegWrite = true;
        } else if (op.startsWith('addi') || op === 'lw' || op === 'sw') {
            // Tipo I
            processorState.controlSignals.ALUSrc = true;
            processorState.controlSignals.RegWrite = op !== 'sw';
            processorState.controlSignals.MemRead = op === 'lw';
            processorState.controlSignals.MemWrite = op === 'sw';
            processorState.controlSignals.MemToReg = op === 'lw';
            processorState.controlSignals.ALUOp = (op === 'sw' || op === 'lw') ? 0 : 1;
        } else if (op.startsWith('j') || op.startsWith('beq') || op.startsWith('bne')) {
            // Tipo J ou branch
            processorState.controlSignals.Jump = op.startsWith('j');
            processorState.controlSignals.Branch = op.startsWith('beq') || op.startsWith('bne');
            processorState.controlSignals.ALUOp = (op.startsWith('beq') || op.startsWith('bne')) ? 1 : 0;
        }
    }

    function executeInstruction(instruction) {
        const parts = instruction.split(/[\s,]+/).filter(p => p);
        const op = parts[0].toLowerCase();
        
        try {
            if (op.startsWith('add')) {
                const dest = getRegisterNumber(parts[1]);
                const src1 = getRegisterNumber(parts[2]);
                const src2 = op === 'addi' ? 
                    parseInt(parts[3]) : 
                    processorState.registers[getRegisterNumber(parts[3])];
                
                processorState.registers[dest] = processorState.registers[src1] + src2;
            } else if (op === 'lw') {
                const dest = getRegisterNumber(parts[1]);
                const offset = parseInt(parts[2]);
                const base = getRegisterNumber(parts[3]);
                const address = processorState.registers[base] + offset;
                processorState.registers[dest] = processorState.memory[address % processorState.memory.length];
            } else if (op === 'sw') {
                const src = getRegisterNumber(parts[1]);
                const offset = parseInt(parts[2]);
                const base = getRegisterNumber(parts[3]);
                const address = processorState.registers[base] + offset;
                processorState.memory[address % processorState.memory.length] = processorState.registers[src];
            }
        } catch (e) {
            logExecution(`Erro na execução: ${e.message}`, true);
        }
    }

    function getRegisterNumber(reg) {
        if (reg.startsWith('$')) {
            if (registerMap[reg] !== undefined) {
                return registerMap[reg];
            }
            // Tentar converter registradores numéricos ($0, $1, etc.)
            const num = parseInt(reg.substring(1));
            if (!isNaN(num) && num >= 0 && num < 32) {
                return num;
            }
        }
        throw new Error(`Registrador inválido: ${reg}`);
    }

    function updatePipelineState(instruction) {
        if (!config.pipelineMode) return;
        
        // Avançar as instruções pelo pipeline
        processorState.pipeline.WB = { ...processorState.pipeline.MEM };
        processorState.pipeline.MEM = { ...processorState.pipeline.EX };
        processorState.pipeline.EX = { ...processorState.pipeline.ID };
        processorState.pipeline.ID = { ...processorState.pipeline.IF };
        processorState.pipeline.IF = { active: true, instruction };
    }

    function updateControlSignals() {
        for (let signal in processorState.controlSignals) {
            const element = document.getElementById(`signal-${signal}`);
            if (element) {
                element.classList.toggle('active', processorState.controlSignals[signal]);
                
                // Para ALUOp, mostrar o valor
                if (signal === 'ALUOp') {
                    element.textContent = `ALUOp: ${processorState.controlSignals[signal]}`;
                }
            }
        }
    }

    function updateRegisters() {
        for (let i = 0; i < 32; i++) {
            const element = document.getElementById(`reg-${i}`);
            if (element) {
                element.querySelector('span').textContent = processorState.registers[i];
                element.classList.toggle('active', false);
            }
        }
        
        // Destacar registradores usados na última instrução
        if (processorState.ir) {
            const parts = processorState.ir.split(/[\s,]+/).filter(p => p);
            parts.forEach(part => {
                if (part.startsWith('$')) {
                    const regNum = getRegisterNumber(part);
                    const element = document.getElementById(`reg-${regNum}`);
                    if (element) element.classList.toggle('active', true);
                }
            });
        }
    }

    function updatePipeline() {
        const stages = ['IF', 'ID', 'EX', 'MEM', 'WB'];
        stages.forEach(stage => {
            const element = document.getElementById(`stage-${stage}`);
            if (element) {
                element.classList.toggle('active', processorState.pipeline[stage].active);
                element.title = processorState.pipeline[stage].instruction || '';
            }
        });
    }

    function highlightActivePaths(instruction) {
        resetActivePaths();
        
        const op = instruction.split(' ')[0].toLowerCase();
        
        // Caminhos sempre ativos
        activatePath('pc', 'memory');
        activatePath('memory', 'ir');
        activateComponent('pc');
        activateComponent('memory');
        activateComponent('ir');
        
        if (op.startsWith('add') || op.startsWith('sub') || op.startsWith('and') || op.startsWith('or')) {
            // Tipo R
            activatePath('ir', 'registers');
            activatePath('registers', 'alu');
            activatePath('alu', 'registers');
            activateComponent('registers');
            activateComponent('alu');
        } else if (op.startsWith('addi')) {
            // Tipo I (imediato)
            activatePath('ir', 'registers');
            activatePath('registers', 'alu');
            activatePath('alu', 'registers');
            activateComponent('registers');
            activateComponent('alu');
        } else if (op === 'lw') {
            // Load word
            activatePath('ir', 'registers');
            activatePath('registers', 'alu');
            activatePath('alu', 'memory');
            activatePath('memory', 'registers');
            activateComponent('registers');
            activateComponent('alu');
            activateComponent('memory');
        } else if (op === 'sw') {
            // Store word
            activatePath('ir', 'registers');
            activatePath('registers', 'alu');
            activatePath('alu', 'memory');
            activatePath('registers', 'memory');
            activateComponent('registers');
            activateComponent('alu');
            activateComponent('memory');
        } else if (op.startsWith('j') || op.startsWith('beq') || op.startsWith('bne')) {
            // Jump ou branch
            activatePath('control', 'pc');
            activateComponent('control');
            if (op.startsWith('beq') || op.startsWith('bne')) {
                activatePath('ir', 'registers');
                activatePath('registers', 'alu');
                activateComponent('registers');
                activateComponent('alu');
            }
        }
        
        // Sempre mostrar conexões de controle
        activatePath('control', 'pc');
        activatePath('control', 'memory');
        activatePath('control', 'registers');
        activatePath('control', 'alu');
        activateComponent('control');
    }

    function activatePath(from, to) {
        const path = d3.select(`#path-${from}-${to}`);
        if (!path.empty()) {
            path.classed('active-path', true);
        }
    }

    function activateComponent(id) {
        const comp = d3.select(`#comp-${id}`);
        if (!comp.empty()) {
            comp.classed('active-component', true);
        }
    }

    function resetActivePaths() {
        d3.selectAll('.data-path, .control-path').classed('active-path', false);
        d3.selectAll('.component').classed('active-component', false);
    }

    function loadCode() {
        const code = elements.codeEditor.value.trim();
        if (code) {
            resetSimulation();
            logExecution("Código carregado com sucesso");
        } else {
            logExecution("Erro: Nenhum código para carregar", true);
        }
    }

    function logExecution(message, isError = false) {
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        if (isError) logEntry.classList.add('text-danger');
        elements.executionLog.appendChild(logEntry);
        elements.executionLog.scrollTop = elements.executionLog.scrollHeight;
    }
});