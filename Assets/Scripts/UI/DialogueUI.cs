using UnityEngine;
using TMPro; // 如果使用 TextMeshPro
using UnityEngine.UI; // 如果使用标准 Text

public class DialogueUI : MonoBehaviour
{
    [Header("Font Settings")]
    public TMP_FontAsset pixelFont; // 使用 TextMeshPro 时
    // public Font pixelFont; // 使用标准 Text 时 (如果是标准Text请取消注释此行并注释上一行)

    [Header("Dialogue Text")]
    public TextMeshProUGUI dialogueText; // 对话文本
    public TextMeshProUGUI nameText; // 名字文本

    void Start()
    {
        // 尝试自动加载字体，如果未在 Inspector 中赋值
        if (pixelFont == null)
        {
            pixelFont = Resources.Load<TMP_FontAsset>("Fonts/px-text SDF"); // 或者是 "px-text"
        }

        ApplyPixelFont();
    }

    void ApplyPixelFont()
    {
        if (pixelFont != null)
        {
            // 假设 dialogueText 和 nameText 是您的文本组件变量名
            if (dialogueText != null) dialogueText.font = pixelFont;
            if (nameText != null) nameText.font = pixelFont;
        }
    }
}
