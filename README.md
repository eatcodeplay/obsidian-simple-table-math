# Simple Table Math

A plugin for Obsidian that performs mathematical operations on Markdown tables.
It dynamically calculates and displays results within your tables as you edit them.
You can also copy the results to your clipboard.

https://github.com/user-attachments/assets/af3b295f-5bbd-497f-b507-696e9fcbb690

## How to Use

Simple Table Math allows you to perform calculations (sum, average, minimum, maximum, subtraction, multiplication) on columns or rows of numbers within your Markdown tables.
To trigger a calculation, place a special tag within a table cell.

The tag follows this format: `[operation][direction][start:end][currency]`

* **`[operation]`**: A three-letter code indicating the operation:
	* `SUM`: Calculates the sum of the values.
	* `AVG`: Calculates the average of the values.
	* `MIN`: Finds the minimum value.
	* `MAX`: Finds the maximum value.
	* `SUB`: Subtracts the subsequent values from the first value.
	* `MUL`: Multiplies all the values together.
* **`[direction]`**: Indicates the direction of the values to operate on:
	* `^`: Looks at the cells above the current cell in the same column.
	* `<`: Looks at the cells to the left of the current cell in the same row.
* **`[start:end]`** (Optional): Specifies a range of cells to include in the calculation.
	* If omitted, it defaults to all applicable cells in the specified direction.
	* Use a colon-separated format (e.g., `1:3` for the first three cells). The indices are 1-based.
	* You can also just specify a start (e.g., `2`).
* **`[currency]`** (Optional): A 2-4 letter currency code (e.g., `USD`, `EUR`, `GBP`). If provided, the result will be formatted with the specified currency symbol.

## Examples

**A simple summing example:**
```
| Just Numbers |
| -----------: |
|       100.00 |
|        50.00 |
|        25.00 |
|        12.50 |
|         SUM^ |
```

**Calculating the average and sum of columns:**
```
| Name        | Jan  | Feb  | Mar  | Total |
|:----------- |:---- |:---- |:---- |:----- |
| Alice       | 10   | 20   | 15   | SUM<  |
| Bob         | 5    | 12   | 8    | SUM<  |
| **Average** | AVG^ | AVG^ | AVG^ |       |
```

**Combining operations and displaying currency symbols:**

```
| Item        | Price  | Quantity |      Total |
| :---------- | :----: | :------: | ---------: |
| Apple       | $ 1.00 |    5     |    MUL<USD |
| Banana      | $ 0.50 |    10    |    MUL<USD |
| Orange      | $ 0.75 |    7     |    MUL<USD |
| **Average** |        |          | AVG^2:4USD |
| **TOTAL:**  |        |          | SUM^2:4USD |
```

## Key Features

* **Real-time Updates:** Calculations are performed automatically as you type and edit your tables.
* **Directional Operations:** Calculate based on values above or to the left of the tag.
* **Optional Range Selection:** Target specific cells for your calculations.
* **Currency Formatting:** Display results with currency symbols for better readability.
* **Locale-Aware Formatting:** Respects your system's locale for number formatting by default, with an option to override.
* **Copy Results:** When copying a cell containing a calculated value (using `Ctrl + C` or `⌘ + C`), the numerical result will be copied to your clipboard.

## Settings

You can configure Simple Table Math in the Obsidian settings under "Simple Table Math". 
The following options are available:

* **Fractions:** Set the number of decimal places to display in the calculated results.
* **Number formatting:** Enter a locale code (e.g., `en-US`, `de-DE`) to override the default number formatting. If left blank it will use the languagae defined for Obsidian.

## CSS Look & Feel

Simple Table Math will add a CSS class `.stm-value` to every cell containing a calculated value.
You can use this class to style the cells in your tables. By default, these cells will be styled with a bolder font weight.

If the last row of a table contains calculations, it will be styled with a background color to make it easier to see the results.
You can disable this behavior in the plugin settings or write your own CSS snippet to override it.

You can find an example CSS snippet in the [assets/snippet.css](snippet.css) file.

## Gotchas & Known Issues

* **Any column found it the calculation path, will be included in the result.**
  * If your headers contain numbers, make sure exclude them from calculations by using range selection.
* **MOBILE:** Switching between Reading-Mode and Editing-Mode can result in the column not rerendering correctly.
  * Touching/Clicking inside the table or outside should solve that.

## Installation

This Plugin is currently not available in the Obsidian Community Plugins.
You can install it manually by following the instructions below:

1.  Download the latest release from the [Releases](https://github.com/YourUsername/obsidian-simple-table-math/releases) page.
2.  Extract the downloaded ZIP file into your Obsidian vault's plugins folder (e.g., `<your_vault>/.obsidian/plugins/obsidian-simple-table-math`).
3.  **Note:** On some operating systems, the `.obsidian` folder might be hidden. Make sure to show hidden files in your file explorer.
4.  Open Obsidian.
5.  Go to `Settings` -> `Community plugins`.
6.  Make sure `Safe mode` is off.
7.  Find "Simple Table Math" in the list and enable it.

## Contributing

If you find any issues or have suggestions for improvements, feel free to open an issue or submit a pull request on the [GitHub repository](https://github.com/YourUsername/obsidian-simple-table-math).

## License

[MIT License](LICENSE)

---

**Enjoy doing math in your Obsidian tables!**
