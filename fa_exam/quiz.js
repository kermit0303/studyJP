let randomQuestions = [];
let currentQuestionIndex = 0; 
let timer; 
const totalTime = 60*100; 
let timeLeft = totalTime; 

// 隨機選擇 8 道題目
function getRandomQuestions() {
    const shuffled = questions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 80); 
}

// 顯示题目
function displayQuestion() {
    const quizContainer = document.getElementById("quiz-container");
    quizContainer.innerHTML = ""; 

    const q = randomQuestions[currentQuestionIndex]; 
    const questionElement = document.createElement("div");
    questionElement.classList.add("question");
    questionElement.innerHTML = `<strong>${currentQuestionIndex + 1}. ${q.question}</strong>`;

    const optionsList = document.createElement("ul");
    optionsList.classList.add("options");
    
    q.options.forEach((option, index) => {
        
        const listItem = document.createElement("li");
        const isChecked = q.userAnswer === index+1 ? "checked" : ""; 
        listItem.innerHTML = `<input type="radio" name="question${currentQuestionIndex}" value="${index+1}" ${isChecked}> ${option}`;
        
        
        listItem.querySelector("input").addEventListener("change", (e) => {
            randomQuestions[currentQuestionIndex].userAnswer = parseInt(e.target.value);
        });

        optionsList.appendChild(listItem);
    });

    questionElement.appendChild(optionsList);
    quizContainer.appendChild(questionElement);

    
    document.getElementById("prev-btn").style.display = currentQuestionIndex === 0 ? "none" : "inline";
    document.getElementById("next-btn").style.display = currentQuestionIndex === randomQuestions.length - 1 ? "none" : "inline";
}

function startTimer() {
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById("time").innerText = formatTime(timeLeft); 

        if (timeLeft <= 0) {
            clearInterval(timer);
            showresult(); 
        }
    }, 1000);
}

// 
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
}

// 提交答案
function submitAnswer() {
    clearInterval(timer); //
    showresult(); // 
}

// 
function restartQuiz() {
    currentQuestionIndex = 0; // 
    timeLeft = totalTime; // 
    randomQuestions = getRandomQuestions(); // 
    displayQuestion(); // 
    startTimer(); // 
    document.getElementById("result").innerHTML = ""; // 
    document.getElementById("time").innerText = formatTime(timeLeft); // 
}

// 
randomQuestions = getRandomQuestions();
displayQuestion();
startTimer(); // 

// 
document.getElementById("next-btn").addEventListener("click", () => {
    if (currentQuestionIndex < randomQuestions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    } else {
        showresult(); // 
    }
});

document.getElementById("prev-btn").addEventListener("click", () => {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
    }
});

document.getElementById("submit-btn").addEventListener("click", () => {
    submitAnswer(); // 
});

// 
document.getElementById("restart-btn").addEventListener("click", () => {
    restartQuiz(); // 
});

// 
document.getElementById("overview-btn").addEventListener("click", () => {
    showOverview(); // 
});

// 
function showresult() {
    const quizContainer = document.getElementById("quiz-container");
    quizContainer.innerHTML = ""; // 

    const resultElement = document.getElementById("result");
    let score = 0;
    let resultDetails = "";

    randomQuestions.forEach((question, index) => {
        const userAnswerIndex = typeof question.userAnswer === "number" ? question.userAnswer : "未作答"; // 
        const correctAnswerIndex = question.options.indexOf(question.answer)+1; // 

        if (userAnswerIndex === correctAnswerIndex) {
            score++;
            resultDetails += `<p>${index + 1}. ${question.question} - <span style="color:green;">正確!</span> (你的答案: ${question.options[userAnswerIndex-1]})</p>`;
        } else {
            resultDetails += `<p>${index + 1}. ${question.question} - <span style="color:red;">錯誤!</span> (正確答案: ${question.options[correctAnswerIndex-1]}, 你的答案: ${userAnswerIndex !== "未作答" ? question.options[userAnswerIndex-1] : "未作答"})</p>`;
        }
    });

    resultElement.innerHTML = `您的得分是: ${score*1.25}<br> 答對題目: ${score}<br><br>${resultDetails}`;
    //downloadAnswersAsJSON();
}

// 显示作答总览
function showOverview() {
    const overviewContainer = document.getElementById("quiz-container");
    overviewContainer.innerHTML = ""; // 

    const overviewElement = document.createElement("div");
    overviewElement.innerHTML = "<h3>做答總覽</h3>";
    
    randomQuestions.forEach((question, index) => {
        const userAnswer = question.userAnswer ? question.userAnswer : "未作答";
        
        const questionOverview = document.createElement("div");
        questionOverview.innerHTML = `<p><strong>第${index + 1}題</strong> - 你的答案: ${userAnswer} 
        <button onclick="goToQuestion(${index})">前往此题</button></p>`;
        
        overviewElement.appendChild(questionOverview);
    });

    overviewContainer.appendChild(overviewElement);
}

// 
function goToQuestion(index) {
    currentQuestionIndex = index; // 
    displayQuestion(); // 
}
/*
function downloadAnswersAsJSON() {
    // 只保留用户回答过的题目
    const results = randomQuestions.map((q) => {
        // 检查用户是否回答了此题
        if (q.userAnswer !== undefined) {
            const correctAnswerIndex = q.options.indexOf(q.answer); // 正确答案索引
            
            // 提取题号，使用正则表达式匹配数字
            const questionNumberMatch = q.question.match(/(\d+)/);
            const questionNumber = questionNumberMatch ? questionNumberMatch[0] : null; // 取出题号

            return {
                questionNumber: questionNumber, // 题号
                correctAnswer: q.options[correctAnswerIndex], // 正确答案
                userAnswer: q.userAnswer !== undefined ? q.options[q.userAnswer - 1] : "未作答", // 用户答案
                isCorrect: q.userAnswer === correctAnswerIndex + 1 // 是否回答正确
            };
        }
    }).filter(Boolean); // 移除未作答的题目

    // 生成当前的日期和时间作為文件名
    const now = new Date();
    const dateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    const fileName = `quiz_results_${dateTime}.json`;

    // 生成JSON数据
    const jsonData = JSON.stringify(results, null, 2);

    // 创建文件blob
    const blob = new Blob([jsonData], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    
    // 触发下载
    link.click();
}*/