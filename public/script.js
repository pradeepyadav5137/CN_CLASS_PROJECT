document.addEventListener('DOMContentLoaded', function() {
    
    const { jsPDF } = window.jspdf;


    let lineChart, barChart, radarChart;
    let pieCharts = [];
    let doughnutCharts = [];
    let socket;
    let currentRoom = null;
    let currentLabels = [];
    let currentDatasets = [];


    socket = io('https://disagree-flex-algeria-bubble.trycloudflare.com');
    
    
    document.getElementById('generateGraphBtn').addEventListener('click', plotGraphs);
    document.getElementById('downloadPdfBtn').addEventListener('click', downloadAsPDF);
    document.getElementById('joinRoomBtn').addEventListener('click', joinRoom);
    document.getElementById('shareChartsBtn').addEventListener('click', shareCurrentCharts);
    document.getElementById('uploadfile').addEventListener('change', handleFileUpload);

    // Socket.io event handlers
    socket.on('connect', () => {
        console.log('Connected to server with ID:', socket.id);
    });
    
   socket.on('room-joined', (roomInfo) => {
    console.log('Joined room:', roomInfo);
    document.getElementById('participantsList').innerHTML = 
        `<h4>Participants:</h4>${roomInfo.participants.map(p => `<div>${p}</div>`).join('')}`;
    
    // Alert message with room creation/joining confirmation
    if (roomInfo.isAdmin) {
        alert(`Room "${roomInfo.roomId}" created successfully!\nYou are the admin.`);
    } else {
            alert(`Joined room: ${roomInfo.roomId}\nParticipants: ${roomInfo.participants.join(', ')}`);
    }
});

socket.on('user-joined', (userId) => {
    const participantsList = document.getElementById('participantsList');
    participantsList.innerHTML += `<div>User joined: ${userId}</div>`;
    alert(`User "${userId}" has joined the room!`);
});

socket.on('user-left', (userData) => {
    const participantsList = document.getElementById('participantsList');  
    const userId = userData.userId || userData;
    const username = userData.username || `User_${userId.slice(0, 4)}`;
    participantsList.innerHTML += `<div>${username} left</div>`;
    if (currentRoom) {
        alert(`${username} has left the room.`);
    }
    participantsList.scrollTop = participantsList.scrollHeight;
});
socket.on('join-error', (error) => {
    // Alert message for join errors
    alert(`Error joining room: ${error.message || 'Unknown error'}`);
});
    
    socket.on('receive-charts', handleReceivedCharts);

    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) {
            alert("Please select an Excel file!");
            return;
        }

        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                if (rows.length < 2) {
                    alert("Sheet doesn't have enough data.");
                    return;
                }

                const headers = rows[0];
                currentLabels = rows.slice(1).map(row => row[0]);
                currentDatasets = [];

                for (let colIndex = 1; colIndex < headers.length; colIndex++) {
                    const subject = headers[colIndex];
                    const data = rows.slice(1).map(row => parseFloat(row[colIndex]) || 0);

                    currentDatasets.push({
                        label: subject,
                        data: data,
                        backgroundColor: getRandomColor(0.5),
                        borderColor: getRandomColor(1),
                        borderWidth: 2
                    });
                }

                document.getElementById('arrayInput').value = JSON.stringify(currentDatasets[0].data);
                document.getElementById('indexInput').value = JSON.stringify(currentLabels);
                
                plotAllCharts();

            } catch (err) {
                console.error("Error parsing Excel file:", err);
                alert("Failed to read Excel file. Please ensure it's a valid Excel file.");
            }
        };

        reader.readAsArrayBuffer(file);
    }

    function plotGraphs() {
        try {
            const arrayInput = document.getElementById("arrayInput").value;
            const indexInput = document.getElementById("indexInput").value;

            const data = JSON.parse(arrayInput);
            currentLabels = JSON.parse(indexInput);

            if (!Array.isArray(data) || !Array.isArray(currentLabels) || data.length !== currentLabels.length) {
                throw new Error("Both inputs must be arrays of the same length.");
            }

            currentDatasets = [{
                label: 'Values',
                data: data,
                backgroundColor: getBackgroundColors('line', data.length),
                borderColor: 'rgba(0, 121, 107, 1)',
                borderWidth: 2
            }];

            plotAllCharts();

        } catch (error) {
            alert("Error: " + error.message);
            console.error(error);
        }
    }

    function plotAllCharts() {
        // Clear previous charts
        if (lineChart) lineChart.destroy();
        if (barChart) barChart.destroy();
        if (radarChart) radarChart.destroy();
        pieCharts.forEach(chart => chart.destroy());
        doughnutCharts.forEach(chart => chart.destroy());
        pieCharts = [];
        doughnutCharts = [];
        
        // Clear dynamic chart containers
        document.getElementById('pieChartsContainer').innerHTML = '';
        document.getElementById('doughnutChartsContainer').innerHTML = '';

        // Line Chart (all subjects)
        lineChart = new Chart(document.getElementById('lineChart').getContext('2d'), {
            type: 'line',
            data: { labels: currentLabels, datasets: currentDatasets },
            options: chartOptions('All Subjects - Line Chart')
        });

        // Bar Chart (all subjects)
        barChart = new Chart(document.getElementById('barChart').getContext('2d'), {
            type: 'bar',
            data: { labels: currentLabels, datasets: currentDatasets },
            options: chartOptions('All Subjects - Bar Chart')
        });

        // Create individual pie charts for each subject
        currentDatasets.forEach((dataset, index) => {
            const container = document.getElementById('pieChartsContainer');
            const chartId = `pieChart-${index}`;
            
            const chartDiv = document.createElement('div');
            chartDiv.className = 'chart-container';
            chartDiv.innerHTML = `<h3>Pie Chart - ${dataset.label}</h3><canvas id="${chartId}"></canvas>`;
            container.appendChild(chartDiv);
            
            const ctx = document.getElementById(chartId).getContext('2d');
            const chart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: currentLabels,
                    datasets: [{
                        label: dataset.label,
                        data: dataset.data,
                        backgroundColor: currentLabels.map(() => getRandomColor(0.7))
                    }]
                },
                options: chartOptions(`Pie Chart - ${dataset.label}`)
            });
            pieCharts.push(chart);
        });

        // Create individual doughnut charts for each subject
        currentDatasets.forEach((dataset, index) => {
            const container = document.getElementById('doughnutChartsContainer');
            const chartId = `doughnutChart-${index}`;
            
            const chartDiv = document.createElement('div');
            chartDiv.className = 'chart-container';
            chartDiv.innerHTML = `<h3>Doughnut Chart - ${dataset.label}</h3><canvas id="${chartId}"></canvas>`;
            container.appendChild(chartDiv);
            
            const ctx = document.getElementById(chartId).getContext('2d');
            const chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: currentLabels,
                    datasets: [{
                        label: dataset.label,
                        data: dataset.data,
                        backgroundColor: currentLabels.map(() => getRandomColor(0.7))
                    }]
                },
                options: chartOptions(`Doughnut Chart - ${dataset.label}`)
            });
            doughnutCharts.push(chart);
        });

        // Radar Chart (all subjects)
        radarChart = new Chart(document.getElementById('radarChart').getContext('2d'), {
            type: 'radar',
            data: { labels: currentLabels, datasets: currentDatasets },
            options: chartOptions('All Subjects - Radar Chart')
        });

        document.getElementById('shareChartsBtn').disabled = false;
    }

    function shareCurrentCharts() {
        if (!currentRoom) {
            alert('Please join a room first');
            return;
        }
        
        const chartData = {
            labels: currentLabels,
            datasets: currentDatasets,
            pieCharts: pieCharts.map(chart => ({
                labels: chart.data.labels,
                data: chart.data.datasets[0].data,
                label: chart.data.datasets[0].label
            })),
            doughnutCharts: doughnutCharts.map(chart => ({
                labels: chart.data.labels,
                data: chart.data.datasets[0].data,
                label: chart.data.datasets[0].label
            }))
        };
        
        socket.emit('share-charts', { roomId: currentRoom, charts: chartData });
    }

    function handleReceivedCharts(chartData) {
        // Store received data
        currentLabels = chartData.labels;
        currentDatasets = chartData.datasets;
        
        // Clear existing charts
        if (lineChart) lineChart.destroy();
        if (barChart) barChart.destroy();
        if (radarChart) radarChart.destroy();
        pieCharts.forEach(chart => chart.destroy());
        doughnutCharts.forEach(chart => chart.destroy());
        pieCharts = [];
        doughnutCharts = [];
        
        // Clear containers
        document.getElementById('pieChartsContainer').innerHTML = '';
        document.getElementById('doughnutChartsContainer').innerHTML = '';

        // Recreate composite charts
        lineChart = new Chart(document.getElementById('lineChart').getContext('2d'), {
            type: 'line',
            data: { labels: currentLabels, datasets: currentDatasets },
            options: chartOptions('All Subjects - Line Chart')
        });

        barChart = new Chart(document.getElementById('barChart').getContext('2d'), {
            type: 'bar',
            data: { labels: currentLabels, datasets: currentDatasets },
            options: chartOptions('All Subjects - Bar Chart')
        });

        radarChart = new Chart(document.getElementById('radarChart').getContext('2d'), {
            type: 'radar',
            data: { labels: currentLabels, datasets: currentDatasets },
            options: chartOptions('All Subjects - Radar Chart')
        });

        // Recreate pie charts
        chartData.pieCharts.forEach((data, index) => {
            const container = document.getElementById('pieChartsContainer');
            const chartId = `pieChart-${index}`;
            
            const chartDiv = document.createElement('div');
            chartDiv.className = 'chart-container';
            chartDiv.innerHTML = `<h3>Pie Chart - ${data.label}</h3><canvas id="${chartId}"></canvas>`;
            container.appendChild(chartDiv);
            
            pieCharts.push(new Chart(document.getElementById(chartId).getContext('2d'), {
                type: 'pie',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: data.label,
                        data: data.data,
                        backgroundColor: data.labels.map(() => getRandomColor(0.7))
                    }]
                },
                options: chartOptions(`Pie Chart - ${data.label}`)
            }));
        });

        // Recreate doughnut charts
        chartData.doughnutCharts.forEach((data, index) => {
            const container = document.getElementById('doughnutChartsContainer');
            const chartId = `doughnutChart-${index}`;
            
            const chartDiv = document.createElement('div');
            chartDiv.className = 'chart-container';
            chartDiv.innerHTML = `<h3>Doughnut Chart - ${data.label}</h3><canvas id="${chartId}"></canvas>`;
            container.appendChild(chartDiv);
            
            doughnutCharts.push(new Chart(document.getElementById(chartId).getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: data.label,
                        data: data.data,
                        backgroundColor: data.labels.map(() => getRandomColor(0.7))
                    }]
                },
                options: chartOptions(`Doughnut Chart - ${data.label}`)
            }));
        });
    }

    function chartOptions(title) {
        return {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: title
                },
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        };
    }

    function joinRoom() {
        const roomId = document.getElementById('roomId').value.trim();
        if (!roomId) {
            alert('Please enter a room ID');
            return;
        }
        
        socket.emit('join-room', roomId);
        currentRoom = roomId;
    }

    async function downloadAsPDF() {
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            let yPosition = 20;
            const pageWidth = doc.internal.pageSize.getWidth() - 20;
            
            // Add title
            doc.setFontSize(20);
            doc.text('Network Diagram Report', 105, 15, { align: 'center' });
            doc.setFontSize(12);
            yPosition += 10;

            // Add main charts
            const mainCanvases = [
                document.getElementById('lineChart'),
                document.getElementById('barChart'),
                document.getElementById('radarChart')
            ].filter(canvas => canvas !== null);

            for (const canvas of mainCanvases) {
                const canvasImg = await getCanvasAsImage(canvas);
                const imgWidth = pageWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                if (yPosition + imgHeight > doc.internal.pageSize.getHeight() - 20) {
                    doc.addPage();
                    yPosition = 20;
                }
                
                doc.addImage(canvasImg, 'PNG', 10, yPosition, imgWidth, imgHeight);
                yPosition += imgHeight + 10;
            }

            // Add pie charts
            const pieCanvasIds = pieCharts.map((_, i) => `pieChart-${i}`);
            for (const id of pieCanvasIds) {
                const canvas = document.getElementById(id);
                if (!canvas) continue;
                
                const canvasImg = await getCanvasAsImage(canvas);
                const imgWidth = pageWidth * 0.8;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                if (yPosition + imgHeight > doc.internal.pageSize.getHeight() - 20) {
                    doc.addPage();
                    yPosition = 20;
                }
                
                doc.addImage(canvasImg, 'PNG', (pageWidth - imgWidth)/2 + 10, yPosition, imgWidth, imgHeight);
                yPosition += imgHeight + 10;
            }

            // Add doughnut charts
            const doughnutCanvasIds = doughnutCharts.map((_, i) => `doughnutChart-${i}`);
            for (const id of doughnutCanvasIds) {
                const canvas = document.getElementById(id);
                if (!canvas) continue;
                
                const canvasImg = await getCanvasAsImage(canvas);
                const imgWidth = pageWidth * 0.8;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                if (yPosition + imgHeight > doc.internal.pageSize.getHeight() - 20) {
                    doc.addPage();
                    yPosition = 20;
                }
                
                doc.addImage(canvasImg, 'PNG', (pageWidth - imgWidth)/2 + 10, yPosition, imgWidth, imgHeight);
                yPosition += imgHeight + 10;
            }

            doc.save('network-diagrams.pdf');

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please check console for details.');
        }
    }

    function getBackgroundColors(type, count) {
        if (type === 'line') return 'rgba(38, 198, 218, 0.2)';
        
        const colors = [
            'rgba(38, 198, 218, 0.7)',
            'rgba(0, 121, 107, 0.7)',
            'rgba(255, 152, 0, 0.7)',
            'rgba(239, 83, 80, 0.7)',
            'rgba(156, 39, 176, 0.7)',
            'rgba(63, 81, 181, 0.7)',
            'rgba(76, 175, 80, 0.7)'
        ];
        return colors.slice(0, count);
    }

    function getRandomColor(opacity = 1) {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    function getCanvasAsImage(canvas) {
        return new Promise((resolve) => {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            const scale = 2;
            
            tempCanvas.width = canvas.width * scale;
            tempCanvas.height = canvas.height * scale;
            tempCtx.scale(scale, scale);
            tempCtx.drawImage(canvas, 0, 0);
            
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = tempCanvas.toDataURL('image/png');
        });
    }
});