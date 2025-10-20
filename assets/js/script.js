class Calculator {
    constructor(
        previousOperandTextElement,
        currentOperandTextElement,
        historyContainer,
        historyOverlay
    ) {
        // THÊM historyOverlay
        this.previousOperandTextElement = previousOperandTextElement;
        this.currentOperandTextElement = currentOperandTextElement;
        this.historyContainer = historyContainer;
        this.historyMobile = historyOverlayMobile; // <-- Sửa
        this.historyDesktop = historyOverlayDesktop; // <-- Sửa
        this.isError = false;
        this.readyForNewInput = false;
        this.waitingForSecondOperand = false;
        this.clear();
    }

    // Xóa toàn bộ tính toán
    clear() {
        this.currentOperand = "0";
        this.previousOperand = "";
        this.operation = undefined;
        this.readyForNewInput = false;
        this.isError = false; // THÊM MỚI
        this.waitingForSecondOperand = false;
        this.unaryOpStack = [];
        this.unaryBackupStack = [];
        this.updateDisplay();
    }

    // Xóa mục nhập hiện tại
    clearEntry() {
        this.currentOperand = "0";
        this.readyForNewInput = false;
        this.isError = false; // THÊM MỚI
        this.waitingForSecondOperand = false;
        this.unaryOpStack = [];
        this.unaryBackupStack = [];
        this.updateDisplay();
    }

    // Xóa ký tự cuối cùng
    backspace() {
        this.waitingForSecondOperand = false;
        // --- THAY ĐỔI CHÍNH ---
        // Nếu đang có lỗi, Backspace sẽ xóa lỗi đó
        if (this.isError) {
            this.clearEntry();
            return;
        }
        // --- KẾT THÚC THAY ĐỔI ---

        this.readyForNewInput = false;
        this.unaryOpStack = [];
        this.unaryBackupStack = [];
        if (this.currentOperand.length <= 1) {
            this.currentOperand = "0";
        } else {
            this.currentOperand = this.currentOperand.toString().slice(0, -1);
        }
    }

    // THAY THẾ TOÀN BỘ HÀM NÀY
    appendNumber(number) {
        if (this.isError) {
            this.clearEntry();
        }

        // --- BẮT ĐẦU SỬA LỖI ---

        // 1. Kiểm tra dấu chấm NGAY LẬP TỨC.
        //    Logic này áp dụng cho mọi trạng thái.
        if (number === "." && this.currentOperand.includes(".")) return;

        // 2. Xử lý khi đang chờ số thứ 2 (vd: 5 + [nhấn .])
        if (this.waitingForSecondOperand) {
            if (number === ".") {
                this.currentOperand = "0.";
            } else {
                this.currentOperand = number.toString();
            }
            this.waitingForSecondOperand = false;

            // 3. Xử lý khi vừa nhấn '=' (sẵn sàng cho số mới)
        } else if (this.readyForNewInput) {
            this.previousOperand = "";
            this.operation = undefined;
            if (number === ".") {
                this.currentOperand = "0.";
            } else {
                this.currentOperand = number.toString();
            }
            this.readyForNewInput = false;

            // 4. Xử lý nối số bình thường
        } else {
            if (this.currentOperand === "0" && number !== ".") {
                this.currentOperand = number.toString();
            } else {
                // Kiểm tra dấu chấm đã được dời lên đầu hàm
                this.currentOperand =
                    this.currentOperand.toString() + number.toString();
            }
        }
        // --- KẾT THÚC SỬA LỖI ---

        // Reset các stack này sau khi nhập số (logic cũ)
        this.unaryOpStack = [];
        this.unaryBackupStack = [];
    }

    // Chọn một phép toán
    chooseOperation(operation) {
        this.waitingForSecondOperand = false; // Reset cờ
        if (this.isError) {
            this.clearEntry();
        }

        // Xử lý '7, =, +'
        if (
            this.readyForNewInput &&
            !["%", "1/x", "x²", "√x"].includes(operation)
        ) {
            this.operation = operation;
            this.previousOperand = this.currentOperand;
            this.readyForNewInput = false;
            this.waitingForSecondOperand = true; // Đặt cờ mới
            this.updateDisplay();
            return;
        }

        this.readyForNewInput = false;

        // Xử lý toán tử một ngôi
        if (["%", "1/x", "x²", "√x"].includes(operation)) {
            // (Toàn bộ logic xử lý 1 ngôi của bạn giữ nguyên)
            let baseString;
            if (this.operation === "UNARY_DISPLAY") {
                baseString = this.previousOperand;
            } else {
                baseString = this.currentOperand;
            }
            let operationString = "";
            switch (operation) {
                case "x²":
                    operationString = `sqr(${baseString})`;
                    break;
                case "√x":
                    operationString = `√(${baseString})`;
                    break;
                case "1/x":
                    operationString = `1/(${baseString})`;
                    break;
                case "%":
                    operationString = `percent(${baseString})`;
                    break;
            }
            this.computeSingleOperand(operation);
            this.previousOperand = operationString;
            this.operation = "UNARY_DISPLAY";
            return;
        }

        // Xử lý toán tử 2 ngôi
        this.unaryOpStack = [];
        this.unaryBackupStack = [];

        // Cho phép đổi '5 +' thành '5 -'
        if (this.currentOperand === "" && this.previousOperand !== "") {
            this.operation = operation;
            this.updateDisplay();
            return;
        }

        // Tính toán chuỗi (5 + 2 +)
        if (this.previousOperand !== "") {
            this.compute(); // Không truyền 'true'
        }

        // Gán phép toán lần đầu (5 +)
        if (this.currentOperand === "" && this.previousOperand === "") return;

        this.operation = operation;
        this.previousOperand = this.currentOperand;
        // --- THAY ĐỔI CHÍNH ---
        // Xóa: this.currentOperand = '';
        this.waitingForSecondOperand = true; // <-- THAY BẰNG DÒNG NÀY
    }

    // Đổi dấu dương/âm
    negate() {
        this.waitingForSecondOperand = false;
        this.readyForNewInput = false;
        this.unaryOpStack = [];
        this.unaryBackupStack = [];

        if (this.currentOperand === "" || this.currentOperand === "0") return;
        this.currentOperand = parseFloat(this.currentOperand) * -1;
    }

    // THAY THẾ TOÀN BỘ HÀM NÀY
    addEntryToHistory(prevOpString, currentOpString) {
        if (this.isError) return;

        // 1. Tạo một hàm để xây dựng DOM (để tái sử dụng)
        const createHistoryEntry = () => {
            const historyEntry = document.createElement("div");
            historyEntry.classList.add("history-entry");

            const prevOperand = document.createElement("div");
            prevOperand.classList.add("history-previous");
            prevOperand.innerText = prevOpString;

            const currentOperand = document.createElement("div");
            currentOperand.classList.add("history-current");
            currentOperand.innerText = currentOpString;

            historyEntry.appendChild(prevOperand);
            historyEntry.appendChild(currentOperand);
            return historyEntry;
        };

        // 2. Tạo và thêm vào Mobile
        this.historyMobile.prepend(createHistoryEntry());

        // 3. Tạo và thêm vào Desktop
        this.historyDesktop.prepend(createHistoryEntry());
    }

    // CẬP NHẬT: Sửa lỗi lưu lịch sử
    compute(calledByEquals = false) {
        this.waitingForSecondOperand = false;
        // Xử lý trường hợp '9, sqrt, ='
        if (this.operation === "UNARY_DISPLAY" && calledByEquals) {
            this.previousOperand = `${this.previousOperand} =`;
            this.operation = undefined;
            this.readyForNewInput = true;
            this.unaryOpStack = [];
            this.unaryBackupStack = [];

            // Gọi hàm với giá trị hiện tại
            this.addEntryToHistory(this.previousOperand, this.currentOperand);
            return;
        }

        this.unaryOpStack = [];
        this.unaryBackupStack = [];

        let computation;
        const prev = parseFloat(this.previousOperand);
        const op = this.operation;
        const currentVal = isNaN(parseFloat(this.currentOperand))
            ? prev
            : parseFloat(this.currentOperand);

        if (isNaN(prev) || isNaN(currentVal)) return;

        switch (op) {
            case "+":
                computation = prev + currentVal;
                break;
            case "−":
                computation = prev - currentVal;
                break;
            case "×":
                computation = prev * currentVal;
                break;
            case "÷":
                if (currentVal === 0) {
                    computation = "Cannot divide by zero";
                    this.isError = true;
                } else {
                    computation = prev / currentVal;
                }
                break;
            default:
                return;
        }

        // --- THAY ĐỔI CHÍNH ---
        // Xây dựng chuỗi lịch sử TRƯỚC KHI thay đổi state
        const historyPrevString = `${prev} ${op} ${currentVal} =`;
        const historyCurrentString = computation;
        // --- KẾT THÚC THAY ĐỔI ---

        this.currentOperand = computation;
        this.operation = undefined;

        this.readyForNewInput = calledByEquals;

        // --- THAY ĐỔI CHÍNH ---
        if (calledByEquals) {
            // Nếu nhấn '=', cập nhật màn hình và lưu lịch sử
            this.previousOperand = historyPrevString;
            this.addEntryToHistory(historyPrevString, historyCurrentString);
        } else {
            // Nếu là phép tính ngầm (vd: 5 + 2 +)
            // CŨNG LƯU LỊCH SỬ
            this.addEntryToHistory(historyPrevString, historyCurrentString);

            // Không set this.previousOperand,
            // hàm chooseOperation sẽ làm việc đó (vd: '7')
        }
        // --- KẾT THÚC THAY ĐỔI ---
    }

    // --- ĐÂY LÀ HÀM SỬA LỖI CHÍNH ---
    computeSingleOperand(operation) {
        this.waitingForSecondOperand = false;
        const current = parseFloat(this.currentOperand);
        if (isNaN(current)) return;
        let result;

        const lastOp = this.unaryOpStack.pop();

        if (operation === "x²" && lastOp === "√x") {
            result = this.unaryBackupStack.pop();
        } else if (operation === "√x" && lastOp === "x²") {
            result = this.unaryBackupStack.pop();
        } else {
            if (lastOp) this.unaryOpStack.push(lastOp);

            this.unaryBackupStack.push(current);
            this.unaryOpStack.push(operation);

            // --- THAY ĐỔI CHÍNH Ở ĐÂY ---
            switch (operation) {
                case "%":
                    result = current / 100;
                    break;
                case "1/x":
                    if (current === 0) {
                        result = "Cannot divide by zero";
                        this.isError = true; // Đặt cờ lỗi
                    } else {
                        result = 1 / current;
                    }
                    break;
                case "x²":
                    result = Math.pow(current, 2);
                    break;
                case "√x":
                    if (current < 0) {
                        result = "Invalid input";
                        this.isError = true; // Đặt cờ lỗi
                    } else {
                        result = Math.sqrt(current);
                    }
                    break;
                default:
                    return;
            }
            // --- KẾT THÚC THAY ĐỔI ---
        }

        this.currentOperand = result;
        this.readyForNewInput = true;
    }
    // --- KẾT THÚC THAY ĐỔI ---

    // Cập nhật màn hình hiển thị
    // Cập nhật màn hình hiển thị (ĐÃ THAY THẾ)
    updateDisplay() {
        // --- Logic cho SỐ LỚN (Current Operand) ---
        this.currentOperandTextElement.innerText = this.currentOperand;
        const displayElement = this.currentOperandTextElement;
        const defaultFontSizeCurrent = 2.1;
        displayElement.style.fontSize = `${defaultFontSizeCurrent}rem`;

        // if (displayElement.scrollWidth > displayElement.clientWidth) {
        //     let newFontSize =
        //         (displayElement.clientWidth / displayElement.scrollWidth) * 3.5;
        //     newFontSize = Math.max(newFontSize, 1.5);
        //     console.log(newFontSize);
        //     displayElement.style.fontSize = `${newFontSize}rem`;
        // }

        // --- Logic cho DÒNG LỊCH SỬ (Previous Operand) ---

        // 1. Gán text cho dòng lịch sử
        if (this.operation != null) {
            if (this.operation === "UNARY_DISPLAY") {
                this.previousOperandTextElement.innerText =
                    this.previousOperand;
            } else {
                this.previousOperandTextElement.innerText = `${this.previousOperand} ${this.operation}`;
            }
        } else {
            this.previousOperandTextElement.innerText = this.previousOperand;
        }

        // 2. THAY THẾ: Logic hiển thị/ẩn nút cuộn
        const prevDisplayElement = this.previousOperandTextElement;
        // Reset font-size về mặc định (phòng trường hợp cũ)
        prevDisplayElement.style.fontSize = "1.5rem";

        if (prevDisplayElement.scrollWidth > prevDisplayElement.clientWidth) {
            // Nếu bị tràn, hiện các nút
            this.historyContainer.classList.add("overflowing");
            // Tự động cuộn sang phải cùng để xem nội dung mới nhất
            prevDisplayElement.scrollLeft = prevDisplayElement.scrollWidth;
        } else {
            // Nếu không, ẩn đi
            this.historyContainer.classList.remove("overflowing");
        }
    }
}

// --- Kết nối DOM và gán sự kiện (Không thay đổi) ---
const numberButtons = document.querySelectorAll("[data-number]");
const operationButtons = document.querySelectorAll("[data-operation]");
const equalsButton = document.querySelector("[data-equals]");
const backspaceButton = document.querySelector("[data-backspace]");
const clearButton = document.querySelector("[data-clear]");
const clearEntryButton = document.querySelector("[data-ce]");
const negateButton = document.querySelector("[data-negate]");
const previousOperandTextElement = document.querySelector(
    "[data-previous-operand]"
);
const currentOperandTextElement = document.querySelector(
    "[data-current-operand]"
);

// Scroll btn
const historyContainer = document.querySelector(".history-container");
const scrollLeftButton = document.querySelector("#scroll-left");
const scrollRightButton = document.querySelector("#scroll-right");
// 1. Chọn các phần tử cần thiết
const themeToggleButton = document.querySelector("#theme-toggle");
// Chọn đúng thẻ <img> bên trong nút
const themeIcon = document.querySelector("#theme-icon");
const bodyElement = document.body;
// 1. Chọn các phần tử
const historyToggleButton = document.querySelector("#history-toggle");
const historyOverlayMobile = document.querySelector("#history-overlay-mobile");
const historyOverlayDesktop = document.querySelector(
    "#history-overlay-desktop"
);
const backdropOverlay = document.querySelector("#backdrop-overlay"); // Thêm backdrop

const calculator = new Calculator(
    previousOperandTextElement,
    currentOperandTextElement,
    historyContainer,
    historyOverlayMobile, // <-- Phải khớp với tên biến ở trên
    historyOverlayDesktop
);
calculator.updateDisplay();

numberButtons.forEach((button) => {
    button.addEventListener("click", () => {
        calculator.appendNumber(button.innerText);
        calculator.updateDisplay();
    });
});

operationButtons.forEach((button) => {
    button.addEventListener("click", () => {
        calculator.chooseOperation(button.innerText);
        calculator.updateDisplay();
    });
});

// Thay đổi dòng này:
equalsButton.addEventListener("click", (button) => {
    calculator.compute(true); // <--- THÊM 'true' VÀO ĐÂY
    calculator.updateDisplay();
});

clearButton.addEventListener("click", (button) => {
    calculator.clear();
    calculator.updateDisplay();
});

clearEntryButton.addEventListener("click", (button) => {
    calculator.clearEntry();
});

backspaceButton.addEventListener("click", (button) => {
    calculator.backspace();
    calculator.updateDisplay();
});

negateButton.addEventListener("click", (button) => {
    calculator.negate();
    calculator.updateDisplay();
});

scrollLeftButton.addEventListener("click", () => {
    previousOperandTextElement.scrollLeft -= 75; // Cuộn 75px
});

scrollRightButton.addEventListener("click", () => {
    previousOperandTextElement.scrollLeft += 75; // Cuộn 75px
});

// --- CẬP NHẬT: HỖ TRỢ BÀN PHÍM (Đã sửa lỗi Zoom) ---
window.addEventListener("keydown", function (event) {
    // --- BẮT ĐẦU SỬA LỖI ---
    // Nếu phím Ctrl (Windows/Linux) hoặc Meta (Mac/Cmd) đang được nhấn,
    // chúng ta "return" (bỏ qua) ngay lập tức.
    // Điều này cho phép trình duyệt xử lý các phím tắt của nó (như Ctrl + -, Ctrl + +).
    if (event.ctrlKey || event.metaKey) {
        return;
    }
    // --- KẾT THÚC SỬA LỖI ---

    const key = event.key;
    let handled = true; // Cờ để theo dõi phím đã được xử lý

    if ((key >= "0" && key <= "9") || key === ".") {
        calculator.appendNumber(key);
    } else if (key === "+") {
        calculator.chooseOperation("+");
    } else if (key === "-") {
        calculator.chooseOperation("−"); // Sử dụng ký tự '−' (dài)
    } else if (key === "*") {
        calculator.chooseOperation("×"); // Sử dụng ký tự '×'
    } else if (key === "/") {
        calculator.chooseOperation("÷"); // Sử dụng ký tự '÷'
    } else if (key === "%") {
        calculator.chooseOperation("%");
    } else if (key === "Enter" || key === "=") {
        calculator.compute(true);
    } else if (key === "Backspace") {
        calculator.backspace();
    } else if (key === "Escape") {
        calculator.clear();
    } else if (key === "Delete") {
        calculator.clearEntry();
    } else {
        handled = false; // Phím này không được xử lý
    }

    if (handled) {
        // Chỉ ngăn chặn hành vi mặc định NẾU đó là phím chúng ta xử lý
        event.preventDefault();

        // Cập nhật màn hình sau khi nhấn phím
        calculator.updateDisplay();
    }
});

// --- CẬP NHẬT: LOGIC TOGGLE THEME VỚI SVG ---

// 2. Định nghĩa đường dẫn tới icon của bạn
const iconPath = "assets/icons/"; // (Hoặc đường dẫn của bạn)
const sunIcon = `${iconPath}sun.svg`;
const moonIcon = `${iconPath}moon.svg`;

// 3. Gán sự kiện click
themeToggleButton.addEventListener("click", () => {
    // 4. Toggle class 'dark-mode' trên <body>
    bodyElement.classList.toggle("dark-mode");

    // 5. Đổi 'src' của <img>
    if (bodyElement.classList.contains("dark-mode")) {
        themeIcon.src = sunIcon; // Dark mode -> hiện icon mặt trời
    } else {
        themeIcon.src = moonIcon; // Light mode -> hiện icon mặt trăng
    }
});

// --- CẬP NHẬT: LOGIC TOGGLE HISTORY OVERLAY ---

// 2. Gán sự kiện click cho nút Lịch sử
historyToggleButton.addEventListener("click", () => {
    historyOverlayMobile.classList.toggle("show"); // <-- Sửa
    backdropOverlay.classList.toggle("show"); // Cũng toggle backdrop
});

// 3. THÊM MỚI: Gán sự kiện click cho backdrop
backdropOverlay.addEventListener("click", () => {
    // Dùng 'remove' để chắc chắn là đóng lại
    historyOverlayMobile.classList.remove("show"); //
    backdropOverlay.classList.remove("show");
});

// --- CẬP NHẬT: Đóng khi click bên ngoài ---
window.addEventListener("click", (event) => {
    // 1. Kiểm tra xem overlay có đang mở không
    const isOverlayOpen = historyOverlayMobile.classList.contains("show");

    // 2. Kiểm tra xem click có phải là nút toggle KHÔNG
    const clickedOnToggle = event.target.closest("#history-toggle");

    // 3. Kiểm tra xem click có nằm BÊN TRONG overlay KHÔNG
    const clickedInsideOverlay = event.target.closest("#history-overlay");

    // 4. Nếu overlay đang mở VÀ click KHÔNG PHẢI nút toggle VÀ KHÔNG PHẢI overlay
    if (isOverlayOpen && !clickedOnToggle && !clickedInsideOverlay) {
        // Đóng nó lại
        historyOverlayMobile.classList.remove("show");
        backdropOverlay.classList.remove("show");
    }
});
