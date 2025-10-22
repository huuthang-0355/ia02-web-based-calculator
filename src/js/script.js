"use strict";

/**
 * Lớp Calculator quản lý toàn bộ logic và trạng thái của máy tính.
 */
class Calculator {
    /**
     * @param {HTMLElement} previousOperandTextElement Phần tử hiển thị phép tính trước đó.
     * @param {HTMLElement} currentOperandTextElement Phần tử hiển thị số hiện tại.
     * @param {HTMLElement} historyContainer Container cho thanh cuộn lịch sử (mobile).
     * @param {HTMLElement} historyMobile Div chứa lịch sử trên mobile.
     * @param {HTMLElement} historyDesktop Div chứa lịch sử trên desktop.
     */
    constructor(
        previousOperandTextElement,
        currentOperandTextElement,
        historyContainer,
        historyMobile,
        historyDesktop
    ) {
        this.previousOperandTextElement = previousOperandTextElement;
        this.currentOperandTextElement = currentOperandTextElement;
        this.historyContainer = historyContainer;
        this.historyMobile = historyMobile;
        this.historyDesktop = historyDesktop;
        this.isError = false;
        this.readyForNewInput = false;
        this.waitingForSecondOperand = false;
        this.clear();
    }

    /**
     * Reset toàn bộ trạng thái máy tính về giá trị mặc định.
     */
    clear() {
        this.currentOperand = "0";
        this.previousOperand = "";
        this.operation = undefined;
        this.readyForNewInput = false;
        this.isError = false;
        this.waitingForSecondOperand = false;
        this.unaryOpStack = [];
        this.unaryBackupStack = [];
        this.updateDisplay();
    }

    /**
     * Chỉ reset ô nhập liệu hiện tại về 0.
     */
    clearEntry() {
        this.currentOperand = "0";
        this.readyForNewInput = false;
        this.isError = false;
        this.waitingForSecondOperand = false;
        this.unaryOpStack = [];
        this.unaryBackupStack = [];
        this.updateDisplay();
    }

    /**
     * Xóa ký tự cuối cùng của ô nhập liệu hiện tại.
     * Nếu đang có lỗi, hàm này sẽ xóa toàn bộ lỗi.
     */
    backspace() {
        // Corner Case: Nếu màn hình đang hiển thị lỗi, backspace sẽ hoạt động như CE.
        if (this.isError) {
            this.clearEntry();
            return;
        }
        this.waitingForSecondOperand = false;
        this.readyForNewInput = false;
        this.unaryOpStack = [];
        this.unaryBackupStack = [];
        if (this.currentOperand.length <= 1) {
            this.currentOperand = "0";
        } else {
            this.currentOperand = this.currentOperand.toString().slice(0, -1);
        }
    }

    /**
     * Nối một số hoặc dấu chấm vào ô nhập liệu hiện tại.
     * @param {string} number Ký tự số (0-9) hoặc dấu chấm (.).
     */
    appendNumber(number) {
        // Corner Case: Nếu đang có lỗi, nhấn số mới sẽ xóa lỗi và bắt đầu nhập số mới.
        if (this.isError) {
            this.clearEntry();
        }

        // [SỬA LỖI] Logic kiểm tra dấu chấm đã được di chuyển xuống dưới

        // Corner Case: Sau khi nhập "5 +", nhấn số "2" sẽ thay thế số "5" ở dòng dưới.
        if (this.waitingForSecondOperand) {
            if (number === ".") {
                this.currentOperand = "0.";
            } else {
                this.currentOperand = number.toString();
            }
            this.waitingForSecondOperand = false;

            // Corner Case: Sau khi nhấn "=", nhấn số mới sẽ bắt đầu một phép tính mới.
        } else if (this.readyForNewInput) {
            this.previousOperand = "";
            this.operation = undefined;
            if (number === ".") {
                this.currentOperand = "0.";
            } else {
                this.currentOperand = number.toString();
            }
            this.readyForNewInput = false;

            // Luồng hoạt động bình thường: nối số vào chuỗi hiện tại.
        } else {
            if (number === "." && this.currentOperand.toString().includes("."))
                return;

            // Corner Case: Xóa số 0 mặc định ở đầu.
            if (this.currentOperand === "0" && number !== ".") {
                this.currentOperand = number.toString();
            } else {
                // Thêm .toString() để đảm bảo an toàn khi nối chuỗi
                this.currentOperand =
                    this.currentOperand.toString() + number.toString();
            }
        }

        // Reset bộ nhớ toán tử một ngôi mỗi khi nhập số mới.
        this.unaryOpStack = [];
        this.unaryBackupStack = [];
    }

    /**
     * Chọn một phép toán để thực hiện.
     * @param {string} operation Ký hiệu của phép toán (+, −, ×, ÷, √x, ...).
     */
    chooseOperation(operation) {
        if (this.isError) {
            this.clearEntry();
        }

        // Corner Case: Sau khi có kết quả (vd: 7), nhấn "+" sẽ bắt đầu phép tính "7 +".
        if (
            this.readyForNewInput &&
            !["%", "1/x", "x²", "√x"].includes(operation)
        ) {
            this.operation = operation;
            this.previousOperand = this.currentOperand;
            this.readyForNewInput = false;
            this.waitingForSecondOperand = true;
            this.updateDisplay();
            return;
        }

        // Corner Case: Cho phép thay đổi phép toán (vd: từ "9 +" thành "9 -").
        if (
            this.waitingForSecondOperand &&
            !["%", "1.x", "x²", "√x"].includes(operation)
        ) {
            this.operation = operation;
            this.updateDisplay();
            return;
        }

        this.readyForNewInput = false;

        // Xử lý các phép toán một ngôi (√x, x², etc.)
        if (["%", "1/x", "x²", "√x"].includes(operation)) {
            // KIỂM TRA: Nếu đang có phép toán 2 ngôi chờ (vd: "25 +"),
            // thì chỉ tính toán số hiện tại (9 -> 3) và KHÔNG thay đổi phép toán "+".
            if (this.operation && this.operation !== "UNARY_DISPLAY") {
                this.computeSingleOperand(operation);
                // (Hàm này sẽ tự động cập nhật currentOperand và readyForNewInput)
                return;
            }

            // Luồng bình thường: Nếu không có phép toán 2 ngôi nào,
            // thì mới tạo chuỗi hiển thị UNARY_DISPLAY.
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

        // Reset bộ nhớ toán tử một ngôi khi chuyển sang toán tử hai ngôi.
        this.unaryOpStack = [];
        this.unaryBackupStack = [];

        // Corner Case: Thực hiện tính toán chuỗi (vd: "5 + 2 +").
        if (this.previousOperand !== "") {
            this.compute();
        }

        if (this.currentOperand === "" && this.previousOperand === "") return;

        this.operation = operation;
        this.previousOperand = this.currentOperand;
        this.waitingForSecondOperand = true;
    }

    /**
     * Đổi dấu (dương/âm) của số hiện tại.
     */
    negate() {
        this.waitingForSecondOperand = false;
        this.readyForNewInput = false;
        this.unaryOpStack = [];
        this.unaryBackupStack = [];

        if (this.currentOperand === "" || this.currentOperand === "0") return;
        this.currentOperand = parseFloat(this.currentOperand) * -1;
    }

    /**
     * Thêm một mục mới vào bảng lịch sử.
     * @param {string} prevOpString Chuỗi phép tính (vd: "2 + 5 =").
     * @param {string} currentOpString Chuỗi kết quả (vd: "7").
     */
    addEntryToHistory(prevOpString, currentOpString) {
        if (this.isError) return;

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

        this.historyMobile.prepend(createHistoryEntry());
        this.historyDesktop.prepend(createHistoryEntry());
    }

    /**
     * Thực hiện phép tính hai ngôi hoặc hoàn tất một phép tính một ngôi.
     * @param {boolean} calledByEquals Cho biết hàm có được gọi bởi nút '=' hay không.
     */
    compute(calledByEquals = false) {
        // Corner Case: Xử lý khi nhấn "=" liên tiếp (vd: 5 + 2 = = = ...)
        if (
            calledByEquals &&
            this.operation === undefined &&
            this.lastRepeatedOperation
        ) {
            const prev = parseFloat(this.currentOperand);
            const op = this.lastRepeatedOperation;
            const currentVal = this.lastRepeatedOperand;
            let computation;

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
                    computation = prev / currentVal;
                    break;
                default:
                    return;
            }

            const historyPrevString = `${prev} ${op} ${currentVal} =`;
            this.currentOperand = computation;
            this.previousOperand = historyPrevString;
            this.addEntryToHistory(historyPrevString, computation);
            this.updateDisplay();
            return; // Dừng lại sau khi xử lý
        }

        this.waitingForSecondOperand = false;
        // Corner Case: Hoàn tất và lưu lịch sử cho một chuỗi phép toán một ngôi (vd: "√(9) =").
        if (this.operation === "UNARY_DISPLAY" && calledByEquals) {
            this.previousOperand = `${this.previousOperand} =`;
            this.operation = undefined;
            this.readyForNewInput = true;
            this.unaryOpStack = [];
            this.unaryBackupStack = [];
            this.addEntryToHistory(this.previousOperand, this.currentOperand);
            return;
        }

        this.unaryOpStack = [];
        this.unaryBackupStack = [];

        let computation;
        const prev = parseFloat(this.previousOperand);
        const op = this.operation;
        // Corner Case: Xử lý khi nhấn "=" mà không có toán hạng thứ hai (vd: "5 + =" sẽ thành "5 + 5").
        const currentVal = isNaN(parseFloat(this.currentOperand))
            ? prev
            : parseFloat(this.currentOperand);

        if (isNaN(prev) || (isNaN(op) && isNaN(currentVal))) return;

        this.lastRepeatedOperation = op;
        this.lastRepeatedOperand = currentVal;

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
                // Corner Case: Xử lý lỗi chia cho 0.
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

        const historyPrevString = `${prev} ${op} ${currentVal} =`;
        const historyCurrentString = computation;

        this.currentOperand = computation;
        this.operation = undefined;
        this.readyForNewInput = calledByEquals;

        if (calledByEquals) {
            this.previousOperand = historyPrevString;
            this.addEntryToHistory(historyPrevString, historyCurrentString);
        } else {
            this.addEntryToHistory(historyPrevString, historyCurrentString);
        }
    }

    /**
     * Thực hiện các phép toán một ngôi (√x, x², 1/x, %).
     * @param {string} operation Ký hiệu của phép toán một ngôi.
     */
    computeSingleOperand(operation) {
        this.waitingForSecondOperand = false;
        const current = parseFloat(this.currentOperand);
        if (isNaN(current)) return;
        let result;

        const lastOp = this.unaryOpStack.pop();

        // Corner Case: Khắc phục lỗi làm tròn số phẩy động khi thực hiện các phép toán ngược nhau.
        // Ví dụ: √3 rồi bình phương sẽ trả về chính xác 3.
        if (operation === "x²" && lastOp === "√x") {
            result = this.unaryBackupStack.pop();
        } else if (operation === "√x" && lastOp === "x²") {
            result = this.unaryBackupStack.pop();
        } else {
            // Luồng bình thường: lưu lại trạng thái để có thể hoàn tác ở lần sau.
            if (lastOp) this.unaryOpStack.push(lastOp);
            this.unaryBackupStack.push(current);
            this.unaryOpStack.push(operation);

            switch (operation) {
                case "%":
                    result = current / 100;
                    break;
                case "1/x":
                    // Corner Case: Xử lý lỗi chia cho 0.
                    if (current === 0) {
                        result = "Cannot divide by zero";
                        this.isError = true;
                    } else {
                        result = 1 / current;
                    }
                    break;
                case "x²":
                    result = Math.pow(current, 2);
                    break;
                case "√x":
                    // Corner Case: Xử lý lỗi căn bậc hai của số âm.
                    if (current < 0) {
                        result = "Invalid input";
                        this.isError = true;
                    } else {
                        result = Math.sqrt(current);
                    }
                    break;
                default:
                    return;
            }
        }
        this.currentOperand = result;
        this.readyForNewInput = true;
    }

    /**
     * Cập nhật giao diện (DOM) dựa trên trạng thái hiện tại của máy tính.
     */
    updateDisplay() {
        // --- Logic cho SỐ LỚN (Current Operand) -
        this.currentOperandTextElement.innerText = this.currentOperand;
        const displayElement = this.currentOperandTextElement;
        const defaultFontSizeCurrent = 3.5;
        displayElement.style.fontSize = `${defaultFontSizeCurrent}rem`;
        if (displayElement.scrollWidth > displayElement.clientWidth) {
            let newFontSize =
                (displayElement.clientWidth / displayElement.scrollWidth) *
                defaultFontSizeCurrent;
            newFontSize = Math.max(newFontSize, 1.5);
            displayElement.style.fontSize = `${newFontSize}rem`;
        }

        // 1. Gán text cho dòng lịch sử (previous operand)
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
        prevDisplayElement.style.fontSize = "1.5rem";

        if (prevDisplayElement.scrollWidth > prevDisplayElement.clientWidth) {
            this.historyContainer.classList.add("overflowing");

            prevDisplayElement.scrollLeft = prevDisplayElement.scrollWidth;
        } else {
            this.historyContainer.classList.remove("overflowing");
        }
    }
}

// --- KHỞI TẠO VÀ GÁN SỰ KIỆN ---

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
const historyContainer = document.querySelector(".history-container");
const scrollLeftButton = document.querySelector("#scroll-left");
const scrollRightButton = document.querySelector("#scroll-right");
const themeToggleButton = document.querySelector("#theme-toggle");
const themeIcon = document.querySelector("#theme-icon");
const bodyElement = document.body;
const historyToggleButton = document.querySelector("#history-toggle");
const historyOverlayMobile = document.querySelector("#history-overlay-mobile");
const historyOverlayDesktop = document.querySelector(
    "#history-overlay-desktop"
);
const backdropOverlay = document.querySelector("#backdrop-overlay");

const calculator = new Calculator(
    previousOperandTextElement,
    currentOperandTextElement,
    historyContainer,
    historyOverlayMobile,
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

equalsButton.addEventListener("click", () => {
    calculator.compute(true);

    calculator.updateDisplay();
});

clearButton.addEventListener("click", () => {
    calculator.clear();
});

clearEntryButton.addEventListener("click", () => {
    calculator.clearEntry();
});

backspaceButton.addEventListener("click", () => {
    calculator.backspace();
    calculator.updateDisplay();
});

negateButton.addEventListener("click", () => {
    calculator.negate();
    calculator.updateDisplay();
});

scrollLeftButton.addEventListener("click", () => {
    previousOperandTextElement.scrollLeft -= 75;
});

scrollRightButton.addEventListener("click", () => {
    previousOperandTextElement.scrollLeft += 75;
});

window.addEventListener("keydown", function (event) {
    // Corner Case: Bỏ qua nếu người dùng đang dùng phím tắt của trình duyệt (Ctrl + -, Ctrl + +).
    if (event.ctrlKey || event.metaKey) {
        return;
    }
    const key = event.key;
    let handled = true;

    if ((key >= "0" && key <= "9") || key === ".") {
        calculator.appendNumber(key);
    } else if (key === "+") {
        calculator.chooseOperation("+");
    } else if (key === "-") {
        calculator.chooseOperation("−");
    } else if (key === "*") {
        calculator.chooseOperation("×");
    } else if (key === "/") {
        calculator.chooseOperation("÷");
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
        handled = false;
    }

    if (handled) {
        event.preventDefault();
        calculator.updateDisplay();
    }
});

const iconPath = "assets/icons/";
const sunIcon = `${iconPath}sun.svg`;
const moonIcon = `${iconPath}moon.svg`;

themeToggleButton.addEventListener("click", () => {
    bodyElement.classList.toggle("dark-mode");
    if (bodyElement.classList.contains("dark-mode")) {
        themeIcon.src = sunIcon;
    } else {
        themeIcon.src = moonIcon;
    }
});

historyToggleButton.addEventListener("click", () => {
    historyOverlayMobile.classList.toggle("show");
    backdropOverlay.classList.toggle("show");
});

backdropOverlay.addEventListener("click", () => {
    historyOverlayMobile.classList.remove("show");
    backdropOverlay.classList.remove("show");
});

window.addEventListener("click", (event) => {
    const isOverlayOpen = historyOverlayMobile.classList.contains("show");
    const clickedInsideCalculator = event.target.closest(".calculator");
    if (isOverlayOpen && !clickedInsideCalculator) {
        historyOverlayMobile.classList.remove("show");
        backdropOverlay.classList.remove("show");
    }
});
